/* eslint-disable eqeqeq */
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as fg from 'fast-glob';
import * as path from "path";
import { ReplaySymbols } from './replay-symbols';
import { checkCommands, repeatSymbols } from './replay-regex';
import * as gmatter from "gray-matter";
import { Script, ScriptConfig } from './Config';

let rootDir, replayFile;
let saveDoc: boolean;
let speed: number;
let delayNum: number;
let commands: string[] = [];

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "vscode-replay" is now active!');

	let disposable = vscode.commands.registerCommand('vscode-replay.reset', function () {
	});

	context.subscriptions.push(disposable);

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	disposable = vscode.commands.registerCommand('vscode-replay.replay', async () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
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
		duplicateDetection(rootDir);
		let script = readScript(replayFile);
		// let config = getReplayConfig(rootDir);
		let isValid = validateScriptConfig(script.options);
		if (!isValid) {
			return;
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
		typeIt(script.content + "🔚", new vscode.Position(startLine, startCol));

		let t = 1;
	});
	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }

function replaceAll(text: string, search: string, replacement: string): string {
	return text.split(search).join(replacement);
};

function readScript(filePath: string): Script {
	let cnt = fs.readFileSync(filePath, 'utf8');
	let gm = gmatter(cnt);
	let text = repeatSymbols(gm.content);
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
function typeIt(text: string, pos: vscode.Position) {
	if (!text) { return; }
	if (text.length === 0) { return; }

	let editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}
	let _pos = pos;
	let char = text.substring(0, 1);
	++len;
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
		let gotoRegex = /goto:(.*):(.*)/g;
		if (cmd) {
			let gotoMatch = gotoRegex.exec(cmd);
			if (gotoMatch) {
				let line = Number.parseInt(gotoMatch[1]);
				let col = Number.parseInt(gotoMatch[2]);
				_pos = new vscode.Position(line, col);
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
		.then(function () {
			let delay = speed + 80 * Math.random();
			if (Math.random() < 0.1) { delay += delayNum; }
			let _p = new vscode.Position(_pos.line, char.length + _pos.character);
			setTimeout(function () {
				let ch = text.substring(1, text.length);
				if (ch == '🔚') {
					if (editor && saveDoc) {
						editor.document.save();
					}
					return;
				}
				typeIt(ch, _p);
			}, delay);
		});
}
