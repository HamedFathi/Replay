/* eslint-disable eqeqeq */
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from "vscode";
import * as fs from "fs";
import * as fg from "fast-glob";
import * as path from "path";
import { checkCommands, repeatSymbols } from "./replay-regex";
import gmatter from "gray-matter";
import { Script, ScriptConfig } from "./config";

let rootDir, replayFile, nextFile: string | undefined;
let saveDoc: boolean;
let speed: number;
let delayNum: number;

let sp: number;
let dl: number;
let commands: string[] = [];
let clipboard: string = "";
let pause = false;
let globalPosition: vscode.Position;
let globalText: string = "";
let hasSelect = false;
let bSpeed: number;
let bDelayNum: number;
let memories = {};
// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated

  let disposable = vscode.commands.registerCommand(
    "vscode-replay.pause",
    async function () {
      pause = true;
      await vscode.window.activeTextEditor?.document.save();
    }
  );

  context.subscriptions.push(disposable);

  disposable = vscode.commands.registerCommand(
    "vscode-replay.replay",
    async () => {
      if (pause) {
        pause = false;
        await typeIt(
          globalText.substring(1, globalText.length),
          globalPosition
        );
      } else {
        await replayIt();
      }
    }
  );
  context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }

async function replayIt() {
  let editor = vscode.window.activeTextEditor;
  if (!editor) {
    vscode.window.showErrorMessage("No File selected!");
    return;
  }
  rootDir = vscode.workspace.workspaceFolders
    ? vscode.workspace.workspaceFolders[0].uri.fsPath
    : undefined;
  if (!rootDir) {
    return;
  }
  replayFile = replaceAll(editor.document.uri.fsPath, "\\", "/");
  let ext = path.extname(replayFile);
  if (ext !== ".vscreplay") {
    vscode.window.showErrorMessage("You should select a '.vscreplay' file.");
    return;
  }
  duplicateDetection(rootDir);
  let script = readScript(replayFile);
  // let config = getReplayConfig(rootDir);
  let isValid = validateScriptConfig(script.options);
  if (!isValid) {
    return;
  }
  if (script.options.next) {
    if (script.options.next.trim() == "") {
      nextFile = undefined;
    }
    nextFile = path.resolve(rootDir, script.options.next);
    let nf = replaceAll(path.resolve(rootDir, script.options.next), "\\", "/");
    if (nf == replayFile) {
      vscode.window.showErrorMessage(`'next' cannot refer to itself.`);
      nextFile = undefined;
      return;
    }
    let nextFileExists = fs.existsSync(nextFile);
    if (!nextFileExists) {
      vscode.window.showErrorMessage(`'next' does not exist.`);
      nextFile = undefined;
      return;
    }
    let nextFileExt = path.extname(nextFile);
    if (nextFileExt != ".vscreplay") {
      vscode.window.showErrorMessage(
        `'next' shoud refer to the '.vscreplay' file format.`
      );
      nextFile = undefined;
      return;
    }
  } else {
    nextFile = undefined;
  }

  let file = path.resolve(rootDir, script.options.file);
  let dir = path.dirname(file);
  let vscFile: vscode.Uri = vscode.Uri.file(file);
  let dirExists = fs.existsSync(dir);
  if (!dirExists) {
    fs.mkdirSync(dir, { recursive: true });
  }
  let fileExists = fs.existsSync(file);
  let isClean = script.options.clean ? script.options.clean : false;
  if (fileExists) {
    if (isClean) {
      fs.writeFileSync(file, "", { encoding: "utf8" });
    }
  } else {
    fs.writeFileSync(file, "", { encoding: "utf8" });
  }
  await vscode.window.showTextDocument(vscFile);

  let startLine = script.options.line != undefined ? script.options.line : 0;
  let startCol = script.options.col != undefined ? script.options.col : 0;
  saveDoc = script.options.save != undefined ? script.options.save : true;
  sp = script.options.speed != undefined ? script.options.speed : 20;
  if (sp < 0) {
    sp = 0;
  }
  if (sp > 200) {
    sp = 200;
  }
  dl = script.options.delay != undefined ? script.options.delay : 250;
  if (dl < 0) {
    dl = 0;
  }
  if (dl > 400) {
    dl = 400;
  }

  bSpeed = script.options.bspeed != undefined ? script.options.bspeed : 20;
  if (bSpeed < 0) {
    bSpeed = 0;
  }
  if (bSpeed > 200) {
    bSpeed = 200;
  }
  bDelayNum = script.options.bdelay != undefined ? script.options.bdelay : 250;
  if (bDelayNum < 0) {
    bDelayNum = 0;
  }
  if (bDelayNum > 400) {
    bDelayNum = 400;
  }

  await typeIt(script.content, new vscode.Position(startLine, startCol));
}

function replaceAll(text: string, search: string, replacement: string): string {
  return text.split(search).join(replacement);
}

function readScript(filePath: string): Script {
  let cnt = fs.readFileSync(filePath, "utf8");
  let gm = gmatter(cnt);
  let text = "❅" + repeatSymbols(gm.content) + "🔚";
  text = removeCarriageReturns(text);
  let data = checkCommands(text);
  commands = data.commands;
  return {
    content: data.text,
    options: gm.data as ScriptConfig,
  };
}

function validateScriptConfig(options: ScriptConfig): boolean {
  if (!("file" in options)) {
    vscode.window.showErrorMessage(
      `You must set 'file' in your replay script file.`
    );
    return false;
  }
  if ("line" in options) {
    if (!Number.isInteger(options.line)) {
      vscode.window.showErrorMessage(`'line' must set as a positive integer.`);
      return false;
    }
  }
  if ("col" in options) {
    if (!Number.isInteger(options.col)) {
      vscode.window.showErrorMessage(`'col' must set as a positive integer.`);
      return false;
    }
  }
  if ("speed" in options) {
    if (!Number.isInteger(options.speed)) {
      vscode.window.showErrorMessage(`'speed' must set as a positive integer.`);
      return false;
    }
  }
  if ("delay" in options) {
    if (!Number.isInteger(options.delay)) {
      vscode.window.showErrorMessage(`'delay' must set as a positive integer.`);
      return false;
    }
  }
  if ("bspeed" in options) {
    if (!Number.isInteger(options.bspeed)) {
      vscode.window.showErrorMessage(`'bspeed' must set as a positive integer.`);
      return false;
    }
  }
  if ("bdelay" in options) {
    if (!Number.isInteger(options.bdelay)) {
      vscode.window.showErrorMessage(`'bdelay' must set as a positive integer.`);
      return false;
    }
  }
  if ("clean" in options) {
    if (typeof options.clean != "boolean") {
      vscode.window.showErrorMessage(`'clean' must set as a boolean.`);
      return false;
    }
  }
  if ("save" in options) {
    if (typeof options.save != "boolean") {
      vscode.window.showErrorMessage(`'save' must set as a boolean.`);
      return false;
    }
  }
  return true;
}

function duplicateDetection(rootDir: string | undefined): void {
  if (rootDir) {
    if (rootDir.length > 0) {
      let dir = `${replaceAll(rootDir, "\\", "/")}/**/*.vscreplay`;
      const files = fg.sync(dir, {
        caseSensitiveMatch: false,
        globstar: true,
        dot: true,
        onlyFiles: true,
      });
      let f: string[] = [];
      for (let index = 0; index < files.length; index++) {
        const file = replaceAll(
          files[index].replace(path.dirname(files[index]), ""),
          "/",
          ""
        );
        f.push(file.toLowerCase());
      }
      let dup = findDuplicates(f);
      if (dup.length > 0) {
        vscode.window.showErrorMessage(
          `In the entire working directory, you cannot use duplicate file names. the following files are duplicate: ${dup.join(
            ", "
          )}`
        );
        return;
      }
    }
  }
}

const findDuplicates = (arry: string[]) =>
  arry.filter((item, index) => arry.indexOf(item) !== index);

function removeCarriageReturns(text: string): string {
  if (!text) {
    return "";
  }
  return replaceAll(text, "\r", "");
}

let len = 0;
async function typeIt(text: string, pos: vscode.Position) {
  if (!text) {
    return;
  }
  if (text.length === 0) {
    return;
  }

  let editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  hasSelect = false;
  let _pos = pos;
  let char = text.substring(0, 1);
  if (char == "⌫") {
    speed = bSpeed;
    delayNum = bDelayNum;
  } else {
    speed = sp;
    delayNum = dl;
  }
  ++len;
  if (char == "❅") {
    char = "";
    _pos = new vscode.Position(pos.line, pos.character);
  }
  if (char == "⭯") {
    char = "";
    pause = true;
    let result = getCount(text, "⭯");
    if (result.count == 1) {
      const userContinued = await showPersistentMessage();
      if (userContinued) {
        pause = false;
        await typeIt(text.substring(1, text.length), _pos);
      }
      return;
    } else {
      pause = true;
      const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);

      statusBarItem.text = `Auto paused for ${result.count} second(s).`;
      statusBarItem.show();

      let timer = setTimeout(async () => {
        statusBarItem.hide();
        statusBarItem.dispose();
        pause = false;
        clearTimeout(timer);
        await typeIt(result.text, _pos);
      }, result.count * 1000);
      return;
    }

  }
  if (char == "↓") {
    _pos = new vscode.Position(pos.line + 1, pos.character);
    char = "";
  }
  if (char == "↑") {
    _pos = new vscode.Position(pos.line - 1, pos.character);
    char = "";
  }
  if (char == "→") {
    _pos = new vscode.Position(pos.line, pos.character + 1);
    char = "";
  }
  if (char == "←") {
    _pos = new vscode.Position(pos.line, pos.character - 1);
    char = "";
  }
  if (char == "⟿") {
    _pos = new vscode.Position(pos.line, pos.character + 1);
    char = " ";
  }
  if (char == "⇤") {
    _pos = new vscode.Position(pos.line, 0);
    char = "";
  }
  if (char == "⇥") {
    _pos = editor.document.lineAt(pos.line).range.end;
    char = "";
  }
  if (char == "⤒") {
    _pos = editor.document.lineAt(0).range.start;
    char = "";
  }
  if (char == "⤓") {
    _pos = editor.document.lineAt(editor.document.lineCount - 1).range.start;
    char = "";
  }
  if (char == "⧉") {
    char = "";
    let cmd = commands.pop();
    let waitn = /waitn:([0-9]+)(?::(.+))?/g;
    let wait = /wait(?::(.+))?/g;
    let deleteAll = /delete-all/g;
    let speedRegex = /speed:([0-9]+):([0-9]+)/g;
    let gotoRegex = /goto:([0-9]+|ll):([0-9]+|eol)/g;
    let emptyRegex = /empty:([0-9]+|ll)/g;
    let execRegex = /execute:(.+)/g;
    let deleteRegex = /delete:([0-9]+|ll)/g;
    let selectRegex = /selectn\:([0-9]+)\:([0-9]+|ll)\:([0-9]+|eol)\:([0-9]+|ll)\:([0-9]+|eol)/g;
    let copyRegex = /copy\:([0-9]+|ll)\:([0-9]+|eol)\:([0-9]+|ll)\:([0-9]+|eol)/g;
    let cutRegex = /cut\:([0-9]+|ll)\:([0-9]+|eol)\:([0-9]+|ll)\:([0-9]+|eol)/g;
    let pasteRegex = /paste\:([0-9]+|ll)\:([0-9]+|eol)\:([0-9]+|ll)\:([0-9]+|eol)/g;
    let deleteAfterRegex = /delete-after\:([0-9]+|ll)\:([0-9]+|eol)/g;
    let deleteBeforeRegex = /delete-before\:([0-9]+|ll)\:([0-9]+|eol)/g;
    let deleteAreaRegex =
      /delete-area\:([0-9]+|ll)\:([0-9]+|eol)\:([0-9]+|ll)\:([0-9]+|eol)/g;
    let memoryRegex = /memory\:([a-zA-Z][a-zA-Z0-9]*)\:([0-9]+|ll)\:([0-9]+|eol)\:([0-9]+|ll)\:([0-9]+|eol)/g;
    let restoreRegex = /restore\:([a-zA-Z][a-zA-Z0-9]*)\:([0-9]+|ll)\:([0-9]+|eol)\:([0-9]+|ll)\:([0-9]+|eol)/g;

    if (cmd) {
      let selectMatch = selectRegex.exec(cmd);
      let gotoMatch = gotoRegex.exec(cmd);
      let speedMatch = speedRegex.exec(cmd);
      let emptyMatch = emptyRegex.exec(cmd);
      let deleteMatch = deleteRegex.exec(cmd);
      let copyMatch = copyRegex.exec(cmd);
      let cutMatch = cutRegex.exec(cmd);
      let pasteMatch = pasteRegex.exec(cmd);
      let execMatch = execRegex.exec(cmd);
      let deleteAllMatch = deleteAll.exec(cmd);
      let waitnMatch = waitn.exec(cmd);
      let waitMatch = wait.exec(cmd);
      let memoryMatch = memoryRegex.exec(cmd);
      let restoreMatch = restoreRegex.exec(cmd);

      if (memoryMatch) {
        let variable = memoryMatch[1].replace(/\s/g, "");
        let line1 = memoryMatch[2].replace(/\s/g, "") == "ll"
          ? editor.document.lineCount - 1
          : Number.parseInt(memoryMatch[2].replace(/\s/g, ""));
        let col1 =
          memoryMatch[3].replace(/\s/g, "") == "eol"
            ? editor.document.lineAt(line1).range.end.character
            : Number.parseInt(memoryMatch[3].replace(/\s/g, ""));
        let line2 = memoryMatch[4].replace(/\s/g, "") == "ll"
          ? editor.document.lineCount - 1
          : Number.parseInt(memoryMatch[4].replace(/\s/g, ""));
        let col2 =
          memoryMatch[5].replace(/\s/g, "") == "eol"
            ? editor.document.lineAt(line2).range.end.character
            : Number.parseInt(memoryMatch[5].replace(/\s/g, ""));
        let pos1 = new vscode.Position(line1, col1);
        let pos2 = new vscode.Position(line2, col2);
        memories[variable] = editor.document.getText(new vscode.Range(pos1, pos2));
      }
      if (restoreMatch) {
        let variable = restoreMatch[1].replace(/\s/g, "");
        if (memories[variable]) {
          let line1 = restoreMatch[2].replace(/\s/g, "") == "ll"
            ? editor.document.lineCount - 1
            : Number.parseInt(restoreMatch[2].replace(/\s/g, ""));
          let col1 =
            restoreMatch[3].replace(/\s/g, "") == "eol"
              ? editor.document.lineAt(line1).range.end.character
              : Number.parseInt(restoreMatch[3].replace(/\s/g, ""));
          let line2 = restoreMatch[4].replace(/\s/g, "") == "ll"
            ? editor.document.lineCount - 1
            : Number.parseInt(restoreMatch[4].replace(/\s/g, ""));
          let col2 =
            restoreMatch[5].replace(/\s/g, "") == "eol"
              ? editor.document.lineAt(line2).range.end.character
              : Number.parseInt(restoreMatch[5].replace(/\s/g, ""));
          let pos1 = new vscode.Position(line1, col1);
          let pos2 = new vscode.Position(line2, col2);
          await editor.edit(function (editBuilder) {
            let newSelection = new vscode.Selection(pos1, pos2);
            editBuilder.replace(newSelection, memories[variable]);
          });
        }
      }

      if (speedMatch) {
        let s = Number.parseInt(speedMatch[1]);
        let d = Number.parseInt(speedMatch[2]);
        if (s < 0) {
          s = 0;
        }
        if (s > 200) {
          s = 200;
        }
        speed = sp = s;
        if (d < 0) {
          d = 0;
        }
        if (d > 400) {
          d = 400;
        }
        delayNum = dl = d;
      }

      if (waitMatch && !waitMatch.input.trim().startsWith("waitn")) {
        pause = true;
        let msg = "";
        if (waitMatch[1]) {
          msg = waitMatch[1].trim() == "" ? "" : `${waitMatch[1]}, `;
        }
        const userContinued = msg.trim().length > 0
          ? await showPersistentMessage(msg.trim())
          : await showPersistentMessage();

        if (userContinued) {
          pause = false;
          await typeIt(text.substring(1, text.length), _pos);
        }
        return;
      }

      if (waitnMatch) {
        pause = true;
        let count = Number.parseInt(waitnMatch[1].replace(/\s/g, ""));
        let msg = "";
        if (waitnMatch[2]) {
          msg = waitnMatch[2].trim() == "" ? "" : `${waitnMatch[2]}, pause for ${count} second(s).`;
        }
        else {
          msg = `Auto pause for ${count} second(s).`;
        }
        const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
        statusBarItem.text = `${msg}`;
        statusBarItem.show();

        let timer = setTimeout(async () => {
          statusBarItem.hide();
          statusBarItem.dispose();
          pause = false;
          clearTimeout(timer);
          await typeIt(text.substring(1, text.length), _pos);
        }, count * 1000);
        return;
      }

      if (selectMatch) {
        hasSelect = true;
        pause = true;
        let delay = Number.parseInt(selectMatch[1].replace(/\s/g, ""));
        let line1 = selectMatch[2].replace(/\s/g, "") == "ll"
          ? editor.document.lineCount - 1
          : Number.parseInt(selectMatch[2].replace(/\s/g, ""));
        let col1 =
          selectMatch[3].replace(/\s/g, "") == "eol"
            ? editor.document.lineAt(line1).range.end.character
            : Number.parseInt(selectMatch[3].replace(/\s/g, ""));
        let line2 = selectMatch[4].replace(/\s/g, "") == "ll"
          ? editor.document.lineCount - 1
          : Number.parseInt(selectMatch[4].replace(/\s/g, ""));
        let col2 =
          selectMatch[5].replace(/\s/g, "") == "eol"
            ? editor.document.lineAt(line2).range.end.character
            : Number.parseInt(selectMatch[5].replace(/\s/g, ""));
        let pos1 = new vscode.Position(line1, col1);
        let pos2 = new vscode.Position(line2, col2);
        editor.selections = [new vscode.Selection(pos1, pos2)];
        let timer = setTimeout(async () => {
          pause = false;
          clearTimeout(timer);
          await typeIt(text.substring(1, text.length), _pos);
        }, delay * 1000);
        return;
      }

      if (deleteAllMatch) {
        _pos = new vscode.Position(0, 0);
        let daline1 = 0;
        let dacol1 = 0;
        let daline2 = editor.document.lineCount - 1;
        let dacol2 = editor.document.lineAt(editor.document.lineCount - 1).range
          .end.character;
        let dapos1 = new vscode.Position(daline1, dacol1);
        let dapos2 = new vscode.Position(daline2, dacol2);
        await editor.edit(function (editBuilder) {
          let newSelection = new vscode.Selection(dapos1, dapos2);
          editBuilder.delete(newSelection);
        });
      }
      let delbeforeMatch = deleteBeforeRegex.exec(cmd);
      let delafterMatch = deleteAfterRegex.exec(cmd);
      let delareaMatch = deleteAreaRegex.exec(cmd);
      if (execMatch) {
        await vscode.commands.executeCommand(execMatch[1].replace(/\s/g, ""));
      }
      if (delareaMatch) {
        let daline1 = delareaMatch[1].replace(/\s/g, "") == "ll"
          ? editor.document.lineCount - 1
          : Number.parseInt(delareaMatch[1].replace(/\s/g, ""));
        let dacol1 =
          delareaMatch[2].replace(/\s/g, "") == "eol"
            ? editor.document.lineAt(daline1).range.end.character
            : Number.parseInt(delareaMatch[2].replace(/\s/g, ""));
        let daline2 = delareaMatch[3].replace(/\s/g, "") == "ll"
          ? editor.document.lineCount - 1
          : Number.parseInt(delareaMatch[3].replace(/\s/g, ""));
        let dacol2 =
          delareaMatch[4].replace(/\s/g, "") == "eol"
            ? editor.document.lineAt(daline2).range.end.character
            : Number.parseInt(delareaMatch[4].replace(/\s/g, ""));
        let dapos1 = new vscode.Position(daline1, dacol1);
        let dapos2 = new vscode.Position(daline2, dacol2);
        clipboard = editor.document.getText(new vscode.Range(dapos1, dapos2));
        await editor.edit(function (editBuilder) {
          let newSelection = new vscode.Selection(dapos1, dapos2);
          editBuilder.delete(newSelection);
        });
      }

      if (delbeforeMatch) {
        let line1 = delbeforeMatch[1].replace(/\s/g, "") == "ll"
          ? editor.document.lineCount - 1
          : Number.parseInt(delbeforeMatch[1].replace(/\s/g, ""));
        let col1 = 0;
        let _pos1 = new vscode.Position(line1, col1);
        let line2 = delbeforeMatch[1].replace(/\s/g, "") == "ll"
          ? editor.document.lineCount - 1
          : Number.parseInt(delbeforeMatch[1].replace(/\s/g, ""));
        let col2 = delbeforeMatch[2].replace(/\s/g, "") == "eol"
          ? editor.document.lineAt(line2).range.end.character
          : Number.parseInt(delbeforeMatch[2].replace(/\s/g, ""));
        let _pos2 = new vscode.Position(line2, col2);
        await editor.edit(function (editBuilder) {
          let newSelection = new vscode.Selection(_pos1, _pos2);
          editBuilder.delete(newSelection);
        });
      }
      if (delafterMatch) {
        let line1 = delafterMatch[1].replace(/\s/g, "") == "ll"
          ? editor.document.lineCount - 1
          : Number.parseInt(delafterMatch[1].replace(/\s/g, ""));
        let col1 = editor.document.lineAt(line1).range.end.character;
        let _pos1 = new vscode.Position(line1, col1);
        let line2 = delafterMatch[1].replace(/\s/g, "") == "ll"
          ? editor.document.lineCount - 1
          : Number.parseInt(delafterMatch[1].replace(/\s/g, ""));
        let col2 = delafterMatch[2].replace(/\s/g, "") == "eol"
          ? editor.document.lineAt(line2).range.end.character
          : Number.parseInt(delafterMatch[2].replace(/\s/g, ""));
        let _pos2 = new vscode.Position(line2, col2);
        await editor.edit(function (editBuilder) {
          let newSelection = new vscode.Selection(_pos2, _pos1);
          editBuilder.delete(newSelection);
        });
      }
      if (gotoMatch) {
        let line = gotoMatch[1].replace(/\s/g, "") == "ll"
          ? editor.document.lineCount - 1
          : Number.parseInt(gotoMatch[1].replace(/\s/g, ""));
        let col =
          gotoMatch[2].replace(/\s/g, "") == "eol"
            ? editor.document.lineAt(line).range.end.character
            : Number.parseInt(gotoMatch[2].replace(/\s/g, ""));
        _pos = new vscode.Position(line, col);
      }
      if (emptyMatch) {
        let line = emptyMatch[1].replace(/\s/g, "") == "ll"
          ? editor.document.lineCount - 1
          : Number.parseInt(emptyMatch[1].replace(/\s/g, ""));
        _pos = new vscode.Position(line, 0);
        let end = editor.document.lineAt(line).range.end;
        await editor.edit(function (editBuilder) {
          let newSelection = new vscode.Selection(_pos, end);
          editBuilder.delete(newSelection);
        });
      }
      if (deleteMatch) {
        let line = deleteMatch[1].replace(/\s/g, "") == "ll"
          ? editor.document.lineCount - 1
          : Number.parseInt(deleteMatch[1].replace(/\s/g, ""));
        _pos = new vscode.Position(line, 0);
        let end = new vscode.Position(line + 1, 0);
        await editor.edit(function (editBuilder) {
          let newRange = new vscode.Range(_pos, end);
          editBuilder.delete(newRange);
        });
      }

      if (copyMatch) {
        let line1 = copyMatch[1].replace(/\s/g, "") == "ll"
          ? editor.document.lineCount - 1
          : Number.parseInt(copyMatch[1].replace(/\s/g, ""));
        let col1 =
          copyMatch[2].replace(/\s/g, "") == "eol"
            ? editor.document.lineAt(line1).range.end.character
            : Number.parseInt(copyMatch[2].replace(/\s/g, ""));
        let line2 = copyMatch[3].replace(/\s/g, "") == "ll"
          ? editor.document.lineCount - 1
          : Number.parseInt(copyMatch[3].replace(/\s/g, ""));
        let col2 =
          copyMatch[4].replace(/\s/g, "") == "eol"
            ? editor.document.lineAt(line2).range.end.character
            : Number.parseInt(copyMatch[4].replace(/\s/g, ""));
        let pos1 = new vscode.Position(line1, col1);
        let pos2 = new vscode.Position(line2, col2);
        clipboard = editor.document.getText(new vscode.Range(pos1, pos2));
      }
      if (pasteMatch) {
        let line1 = pasteMatch[1].replace(/\s/g, "") == "ll"
          ? editor.document.lineCount - 1
          : Number.parseInt(pasteMatch[1].replace(/\s/g, ""));
        let col1 =
          pasteMatch[2].replace(/\s/g, "") == "eol"
            ? editor.document.lineAt(line1).range.end.character
            : Number.parseInt(pasteMatch[2].replace(/\s/g, ""));
        let line2 = pasteMatch[3].replace(/\s/g, "") == "ll"
          ? editor.document.lineCount - 1
          : Number.parseInt(pasteMatch[3].replace(/\s/g, ""));
        let col2 =
          pasteMatch[4].replace(/\s/g, "") == "eol"
            ? editor.document.lineAt(line2).range.end.character
            : Number.parseInt(pasteMatch[4].replace(/\s/g, ""));
        let pos1 = new vscode.Position(line1, col1);
        let pos2 = new vscode.Position(line2, col2);
        await editor.edit(function (editBuilder) {
          let newSelection = new vscode.Selection(pos1, pos2);
          editBuilder.replace(newSelection, clipboard);
        });
      }
      if (cutMatch) {
        let line1 = cutMatch[1].replace(/\s/g, "") == "ll"
          ? editor.document.lineCount - 1
          : Number.parseInt(cutMatch[1].replace(/\s/g, ""));
        let col1 =
          cutMatch[2].replace(/\s/g, "") == "eol"
            ? editor.document.lineAt(line1).range.end.character
            : Number.parseInt(cutMatch[2].replace(/\s/g, ""));
        let line2 = cutMatch[3].replace(/\s/g, "") == "ll"
          ? editor.document.lineCount - 1
          : Number.parseInt(cutMatch[3].replace(/\s/g, ""));
        let col2 =
          cutMatch[4].replace(/\s/g, "") == "eol"
            ? editor.document.lineAt(line2).range.end.character
            : Number.parseInt(cutMatch[4].replace(/\s/g, ""));
        let pos1 = new vscode.Position(line1, col1);
        let pos2 = new vscode.Position(line2, col2);
        clipboard = editor.document.getText(new vscode.Range(pos1, pos2));
        await editor.edit(function (editBuilder) {
          let newSelection = new vscode.Selection(pos1, pos2);
          editBuilder.delete(newSelection);
        });
      }
    }
  }
  if (char == "⮒") {
    _pos = new vscode.Position(pos.line + 1, 0);
    char = "\n";
  }
  editor
    .edit(function (editBuilder) {
      if (char != "⌫") {
        editBuilder.insert(_pos, char);
      } else {
        try {
          speed = bSpeed;
          delayNum = bDelayNum;
          _pos = new vscode.Position(pos.line, pos.character - 1);
          let selection = new vscode.Selection(_pos, pos);
          editBuilder.delete(selection);
          char = "";
        } catch (error) { }
      }
      let newSelection = new vscode.Selection(_pos, _pos);
      if (char == "\n" || char == "⮒") {
        newSelection = new vscode.Selection(pos, pos);
        _pos = new vscode.Position(pos.line + 1, 0);
        char = "";
      }
      if (editor && !hasSelect) {
        editor.selection = newSelection;
      }
    })
    .then(async function () {
      let delay = speed + (delayNum == 0 ? 0 : 80 * Math.random());
      if (Math.random() < 0.1 && delayNum != 0) {
        delay += delayNum;
      }
      let _p = new vscode.Position(_pos.line, char.length + _pos.character);
      globalPosition = _p;
      globalText = text;
      if (pause) {
        return;
      }
      await new Promise<void>((resolve) => {
        setTimeout(async () => {
          let ch = text.substring(1, text.length);
          if (ch == "🔚") {
            if (editor && saveDoc) {
              await editor.document.save();
            }
            if (nextFile) {
              let vscNextFile: vscode.Uri = vscode.Uri.file(nextFile);
              await vscode.window.showTextDocument(vscNextFile);
              replayIt();
            }
            else {
              const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
              statusBarItem.text = `Congratulation! Presentation is over.`;
              statusBarItem.show();

              setTimeout(() => {
                statusBarItem.hide();
                statusBarItem.dispose();
                return;
              }, 5000);
            }

            return;
          }
          await typeIt(ch, _p);
          resolve();
        }, delay);
      });
    });
}

async function showPersistentMessage(message?: string): Promise<boolean> {
  let selection: string | undefined;
  const defaultMessage = 'You must click Continue to proceed';
  while (!selection) {
    selection = await vscode.window.showQuickPick(['Continue'], {
      placeHolder: message || defaultMessage,
      canPickMany: false,
      ignoreFocusOut: true
    });

    if (!selection) {
      continue;
    }
  }

  return selection === 'Continue';
}

function getCount(text: string, ch: string): { text: string; count: number } {
  let count = 0;
  for (let index = 0; index < text.length; index++) {
    const item = text[index];
    if (item == ch) {
      count++;
    } else {
      break;
    }
  }
  return {
    count,
    text: text.substring(count),
  };
}