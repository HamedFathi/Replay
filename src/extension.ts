/* eslint-disable eqeqeq */
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as fg from 'fast-glob';
import * as path from "path";
import { checkCommands, repeatSymbols } from './replay-regex';
import * as gmatter from "gray-matter";
import { Script, ScriptConfig } from './Config';

let rootDir, replayFile, nextFile: string | undefined;
let saveDoc: boolean;
let speed: number;
let delayNum: number;
let commands: string[] = [];
let clipboard: string = "";
let pause = false;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated

	let disposable = vscode.commands.registerCommand('vscode-replay.reset', function () {
	});

	context.subscriptions.push(disposable);

	disposable = vscode.commands.registerCommand('vscode-replay.replay', async () => {
		await replayIt();
	});
	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }


async function replayIt() {
	let editor = vscode.window.activeTextEditor;
	if (!editor) {
		vscode.window.showErrorMessage('No File selected!');
		return;
	}
	rootDir = vscode.workspace.workspaceFolders ? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;
	if (!rootDir) {
		return;
	}
	replayFile = replaceAll(editor.document.uri.fsPath, '\\', '/');
	let ext = path.extname(replayFile);
	if (ext !== '.vscreplay') {
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
		nextFile = path.resolve(rootDir, script.options.next);
		let nf = replaceAll(path.resolve(rootDir, script.options.next), '\\', '/');
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
		if (nextFileExt != '.vscreplay') {
			vscode.window.showErrorMessage(`'next' shoud refer to the '.vscreplay' file format.`);
			nextFile = undefined;
			return;
		}
	}
	else {
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
			fs.writeFileSync(file, "", { encoding: 'utf8' });
		}
	} else {
		fs.writeFileSync(file, "", { encoding: 'utf8' });
	}
	await vscode.window.showTextDocument(vscFile);

	let startLine = script.options.line != undefined ? script.options.line : 0;
	let startCol = script.options.col != undefined ? script.options.col : 0;
	saveDoc = script.options.save != undefined ? script.options.save : true;
	speed = script.options.speed != undefined ? script.options.speed : 20;
	if (speed < 1) {
		speed = 1;
	}
	if (speed > 200) {
		speed = 200;
	}
	delayNum = script.options.delay != undefined ? script.options.delay : 250;
	if (delayNum < 50) {
		delayNum = 50;
	}
	if (delayNum > 400) {
		delayNum = 400;
	}

	await typeIt(script.content, new vscode.Position(startLine, startCol));
}

function replaceAll(text: string, search: string, replacement: string): string {
	return text.split(search).join(replacement);
};

function readScript(filePath: string): Script {
	let cnt = fs.readFileSync(filePath, 'utf8');
	let gm = gmatter(cnt);
	let text = repeatSymbols(gm.content) + "🔚";
	text = removeBackSlashR(text);
	let rgx = /⨷\s*\n/gm;
	text = text.replace(rgx, '');
	let data = checkCommands(text);
	commands = data.commands;
	return {
		content: data.text,
		options: gm.data as ScriptConfig
	};
}

function validateScriptConfig(options: ScriptConfig): boolean {
	if (!('file' in options)) {
		vscode.window.showErrorMessage(`You must set 'file' in your replay script file.`);
		return false;
	}
	if (('line' in options)) {
		if (!Number.isInteger(options.line)) {
			vscode.window.showErrorMessage(`'line' must set as a positive integer.`);
			return false;
		}
	}
	if (('col' in options)) {
		if (!Number.isInteger(options.col)) {
			vscode.window.showErrorMessage(`'col' must set as a positive integer.`);
			return false;
		}
	}
	if (('speed' in options)) {
		if (!Number.isInteger(options.speed)) {
			vscode.window.showErrorMessage(`'speed' must set as a positive integer.`);
			return false;
		}
	}
	if (('delay' in options)) {
		if (!Number.isInteger(options.delay)) {
			vscode.window.showErrorMessage(`'delay' must set as a positive integer.`);
			return false;
		}
	}
	if (('clean' in options)) {
		if (typeof options.clean != 'boolean') {
			vscode.window.showErrorMessage(`'clean' must set as a boolean.`);
			return false;
		}
	}
	if (('save' in options)) {
		if (typeof options.save != 'boolean') {
			vscode.window.showErrorMessage(`'save' must set as a boolean.`);
			return false;
		}
	}
	return true;
}

function getReplayConfig(rootDir: string | undefined): any {
	if (rootDir) {
		if (rootDir.length > 0) {
			let dir = `${replaceAll(rootDir, '\\', '/')}/**/config.vscreplay.json`;
			let files = fg.sync(dir, { caseSensitiveMatch: false, globstar: true, dot: true, onlyFiles: true });
			if (files.length > 0) {
				let cnt = fs.readFileSync(files[0], 'utf8');
				return JSON.parse(cnt);
			}
		}
	}
	return undefined;
}

function duplicateDetection(rootDir: string | undefined): void {
	if (rootDir) {
		if (rootDir.length > 0) {
			let dir = `${replaceAll(rootDir, '\\', '/')}/**/*.vscreplay`;
			const files = fg.sync(dir,
				{ caseSensitiveMatch: false, globstar: true, dot: true, onlyFiles: true });
			let f: string[] = [];
			for (let index = 0; index < files.length; index++) {
				const file = replaceAll(files[index].replace(path.dirname(files[index]), ""), '/', '');
				f.push(file.toLowerCase());
			}
			let dup = findDuplicates(f);
			if (dup.length > 0) {
				vscode.window.showErrorMessage(`In the entire working directory, you cannot use duplicate file names. the following files are duplicate: ${dup.join(', ')}`);
				return;
			}
		}
	}
}

const findDuplicates = (arry: string[]) => arry.filter((item, index) => arry.indexOf(item) !== index);

function removeBackSlashR(text: string): string {
	if (!text) { return ""; }
	return replaceAll(text, '\r', '');
}

let len = 0;
async function typeIt(text: string, pos: vscode.Position) {
	if (!text) { return; }
	if (text.length === 0) { return; }

	let editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}
	let _pos = pos;
	let char = text.substring(0, 1);
	++len;
	if (char == '⭯') {
		char = '';
		pause = true;
		let result = getCount(text, '⭯');
		if (result.count == 1) {
			let interval = setInterval(_ => {
				vscode.window.showInformationMessage("Do you want to continue?", "Yes", "No")
					.then(async answer => {
						if (answer === "Yes") {
							pause = false;
							clearInterval(interval);
							await typeIt(text.substring(1, text.length), _pos);
						}
						if (answer === "No") {
							pause = true;
							clearInterval(interval);
							return;
						}
					});
			}, 10000);
			vscode.window.showInformationMessage("Do you want to continue?", "Yes", "No")
				.then(async answer => {
					if (answer === "Yes") {
						pause = false;
						clearInterval(interval);
						await typeIt(text.substring(1, text.length), _pos);
					}
					if (answer === "No") {
						pause = true;
						clearInterval(interval);
						return;
					}
				});

		} else {
			vscode.window.showInformationMessage(`Auto typing has been paused for ${result.count} second(s).`);
			let timer = setTimeout(async () => {
				pause = false;
				clearTimeout(timer);
				await typeIt(result.text, _pos);
			}, result.count * 1000);
		}
	}
	if (char == '↓') {
		_pos = new vscode.Position(pos.line + 1, pos.character);
		char = '';
	}
	if (char == '↑') {
		_pos = new vscode.Position(pos.line - 1, pos.character);
		char = '';
	}
	if (char == '→') {
		_pos = new vscode.Position(pos.line, pos.character + 1);
		char = '';
	}
	if (char == '←') {
		_pos = new vscode.Position(pos.line, pos.character - 1);
		char = '';
	}
	if (char == '⟿') {
		_pos = new vscode.Position(pos.line, pos.character + 1);
		char = ' ';
	}
	if (char == '⇤') {
		_pos = new vscode.Position(pos.line, 0);
		char = '';
	}
	if (char == '⇥') {
		_pos = editor.document.lineAt(pos.line).range.end;
		char = '';
	}
	if (char == '⤒') {
		_pos = editor.document.lineAt(0).range.start;
		char = '';
	}
	if (char == '⤓') {
		_pos = editor.document.lineAt(editor.document.lineCount - 1).range.start;
		char = '';
	}
	if (char == '⧉') {
		char = '';
		let cmd = commands.pop();
		let deleteAll = /delete-all/g;
		let gotoRegex = /goto:([0-9]+):([0-9]+|eol)/g;
		let emptyRegex = /empty:([0-9]+)/g;
		let dupBeforeRegex = /duplicate-before:([0-9]+)/g;
		let dupAfterRegex = /duplicate-after:([0-9]+)/g;
		let execRegex = /execute:(.+)/g;
		let deleteRegex = /delete:([0-9]+)/g;
		let copyRegex = /copy\:([0-9]+)\:([0-9]+|eol)\:([0-9]+)\:([0-9]+|eol)/g;
		let cutRegex = /cut\:([0-9]+)\:([0-9]+|eol)\:([0-9]+)\:([0-9]+|eol)/g;
		let pasteRegex = /paste\:([0-9]+)\:([0-9]+|eol)\:([0-9]+)\:([0-9]+|eol)/g;
		let deleteAfterRegex = /delete-after\:([0-9]+)\:([0-9]+)/g;
		let deleteBeforeRegex = /delete-before\:([0-9]+)\:([0-9]+)/g;
		let deleteAreaRegex = /delete-area\:([0-9]+)\:([0-9]+|eol)\:([0-9]+)\:([0-9]+|eol)/g;
		if (cmd) {
			let gotoMatch = gotoRegex.exec(cmd);
			let emptyMatch = emptyRegex.exec(cmd);
			let deleteMatch = deleteRegex.exec(cmd);
			let copyMatch = copyRegex.exec(cmd);
			let cutMatch = cutRegex.exec(cmd);
			let pasteMatch = pasteRegex.exec(cmd);
			let execMatch = execRegex.exec(cmd);
			let dbeforeMatch = dupBeforeRegex.exec(cmd);
			let dafterMatch = dupAfterRegex.exec(cmd);
			let deleteAllMatch = deleteAll.exec(cmd);
			if (deleteAllMatch) {
				_pos = new vscode.Position(0, 0);
				let daline1 = 0;
				let dacol1 = 0;
				let daline2 = editor.document.lineCount - 1;
				let dacol2 = editor.document.lineAt(editor.document.lineCount - 1).range.end.character;
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
				await vscode.commands.executeCommand(execMatch[1]);
			}
			if (delareaMatch) {
				let daline1 = Number.parseInt(delareaMatch[1]);
				let dacol1 = delareaMatch[2] == 'eol' ? editor.document.lineAt(daline1).range.end.character : Number.parseInt(delareaMatch[2]);
				let daline2 = Number.parseInt(delareaMatch[3]);
				let dacol2 = delareaMatch[4] == 'eol' ? editor.document.lineAt(daline2).range.end.character : Number.parseInt(delareaMatch[4]);
				let dapos1 = new vscode.Position(daline1, dacol1);
				let dapos2 = new vscode.Position(daline2, dacol2);
				clipboard = editor.document.getText(new vscode.Range(dapos1, dapos2));
				await editor.edit(function (editBuilder) {
					let newSelection = new vscode.Selection(dapos1, dapos2);
					editBuilder.delete(newSelection);
				});
			}

			if (delbeforeMatch) {
				let line1 = Number.parseInt(delbeforeMatch[1]);
				let col1 = 0;
				let _pos1 = new vscode.Position(line1, col1);
				let line2 = Number.parseInt(delbeforeMatch[1]);
				let col2 = Number.parseInt(delbeforeMatch[2]);
				let _pos2 = new vscode.Position(line2, col2);
				await editor.edit(function (editBuilder) {
					let newSelection = new vscode.Selection(_pos1, _pos2);
					editBuilder.delete(newSelection);
				});
			}
			if (delafterMatch) {
				let line1 = Number.parseInt(delafterMatch[1]);
				let col1 = editor.document.lineAt(line1).range.end.character;
				let _pos1 = new vscode.Position(line1, col1);
				let line2 = Number.parseInt(delafterMatch[1]);
				let col2 = Number.parseInt(delafterMatch[2]);
				let _pos2 = new vscode.Position(line2, col2);
				await editor.edit(function (editBuilder) {
					let newSelection = new vscode.Selection(_pos2, _pos1);
					editBuilder.delete(newSelection);
				});
			}
			if (gotoMatch) {
				let line = Number.parseInt(gotoMatch[1]);
				let col = gotoMatch[2] == 'eol' ? editor.document.lineAt(line).range.end.character : Number.parseInt(gotoMatch[2]);
				_pos = new vscode.Position(line, col);
			}
			if (emptyMatch) {
				let line = Number.parseInt(emptyMatch[1]);
				_pos = new vscode.Position(line, 0);
				let end = editor.document.lineAt(line).range.end;
				await editor.edit(function (editBuilder) {
					let newSelection = new vscode.Selection(_pos, end);
					editBuilder.delete(newSelection);
				});
			}
			if (deleteMatch) {
				let line = Number.parseInt(deleteMatch[1]);
				_pos = new vscode.Position(line, 0);
				let end = new vscode.Position(line + 1, 0);
				await editor.edit(function (editBuilder) {
					let newRange = new vscode.Range(_pos, end);
					editBuilder.delete(newRange);
				});
			}
			if (dbeforeMatch) {
				let copyline1 = Number.parseInt(dbeforeMatch[1]);
				let copycol1 = 0;
				let copyline2 = Number.parseInt(dbeforeMatch[1]);
				let copycol2 = editor.document.lineAt(copyline2).range.end.character;
				let copypos1 = new vscode.Position(copyline1, copycol1);
				let copypos2 = new vscode.Position(copyline2, copycol2);
				let data = editor.document.getText(new vscode.Range(copypos1, copypos2)) + '\n';

				let line1 = Number.parseInt(dbeforeMatch[1]);
				let col1 = 0;
				let pos1 = new vscode.Position(line1, col1);
				await editor.edit(function (editBuilder) {
					editBuilder.insert(pos1, data);
				});
			}

			if (dafterMatch) {
				let copyline1 = Number.parseInt(dafterMatch[1]);
				let copycol1 = 0;
				let copyline2 = Number.parseInt(dafterMatch[1]);
				let copycol2 = editor.document.lineAt(copyline2).range.end.character;
				let copypos1 = new vscode.Position(copyline1, copycol1);
				let copypos2 = new vscode.Position(copyline2, copycol2);
				let data = '\n' + editor.document.getText(new vscode.Range(copypos1, copypos2));

				let line1 = Number.parseInt(dafterMatch[1]);
				let col1 = editor.document.lineAt(line1).range.end.character;
				let pos1 = new vscode.Position(line1, col1);
				await editor.edit(function (editBuilder) {
					editBuilder.insert(pos1, data);
				});
			}

			if (copyMatch) {
				let line1 = Number.parseInt(copyMatch[1]);
				let col1 = copyMatch[2] == 'eol' ? editor.document.lineAt(line1).range.end.character : Number.parseInt(copyMatch[2]);
				let line2 = Number.parseInt(copyMatch[3]);
				let col2 = copyMatch[4] == 'eol' ? editor.document.lineAt(line2).range.end.character : Number.parseInt(copyMatch[4]);
				let pos1 = new vscode.Position(line1, col1);
				let pos2 = new vscode.Position(line2, col2);
				clipboard = editor.document.getText(new vscode.Range(pos1, pos2));
			}
			if (pasteMatch) {
				let line1 = Number.parseInt(pasteMatch[1]);
				let col1 = pasteMatch[2] == 'eol' ? editor.document.lineAt(line1).range.end.character : Number.parseInt(pasteMatch[2]);
				let line2 = Number.parseInt(pasteMatch[3]);
				let col2 = pasteMatch[4] == 'eol' ? editor.document.lineAt(line2).range.end.character : Number.parseInt(pasteMatch[4]);
				let pos1 = new vscode.Position(line1, col1);
				let pos2 = new vscode.Position(line2, col2);
				await editor.edit(function (editBuilder) {
					let newSelection = new vscode.Selection(pos1, pos2);
					editBuilder.replace(newSelection, clipboard);
				});
			}
			if (cutMatch) {
				let line1 = Number.parseInt(cutMatch[1]);
				let col1 = cutMatch[2] == 'eol' ? editor.document.lineAt(line1).range.end.character : Number.parseInt(cutMatch[2]);
				let line2 = Number.parseInt(cutMatch[3]);
				let col2 = cutMatch[4] == 'eol' ? editor.document.lineAt(line2).range.end.character : Number.parseInt(cutMatch[4]);
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
	if (char == '⮒') {
		_pos = new vscode.Position(pos.line + 1, 0);
		char = '\n';
	}
	editor.edit(function (editBuilder) {
		if (char != '⌫') {
			editBuilder.insert(_pos, char);
		}
		else {
			_pos = new vscode.Position(pos.line, pos.character - 1);
			let selection = new vscode.Selection(_pos, pos);
			editBuilder.delete(selection);
			char = '';
		}
		let newSelection = new vscode.Selection(_pos, _pos);
		if (char == "\n" || char == '⮒') {
			newSelection = new vscode.Selection(pos, pos);
			_pos = new vscode.Position(pos.line + 1, 0);
			char = '';
		}
		if (editor) {
			editor.selection = newSelection;
		}
	})
		.then(async function () {
			let delay = speed + 80 * Math.random();
			if (Math.random() < 0.1) { delay += delayNum; }
			let _p = new vscode.Position(_pos.line, char.length + _pos.character);
			if (pause) {
				return;
			}
			await new Promise<void>((resolve) => {
				setTimeout(async () => {
					let ch = text.substring(1, text.length);
					if (ch == '🔚') {
						if (editor && saveDoc) {
							editor.document.save();
						}
						if (nextFile) {
							let vscNextFile: vscode.Uri = vscode.Uri.file(nextFile);
							await vscode.window.showTextDocument(vscNextFile);
							replayIt();
						}
						return;
					}
					await typeIt(ch, _p);
					resolve();
				}, delay);
			});
		});
}



function getCount(text: string, ch: string): { text: string, count: number } {

	let count = 0;
	for (let index = 0; index < text.length; index++) {
		const item = text[index];
		if (item == ch) {
			count++;
		}
		else {
			break;
		}
	}
	return {
		count,
		text: text.substring(count)
	};
}