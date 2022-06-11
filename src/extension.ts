/* eslint-disable eqeqeq */
// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as fg from 'fast-glob';
import * as path from "path";
import { ReplaySymbols } from './replay-symbols';
import { repeatSymbols } from './replay-regex';
import * as gmatter from "gray-matter";

let rootDir, replayFile;

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
		let replayDir = path.dirname(replayFile);
		duplicateDetection(rootDir);
		let script = readScript(replayFile);
		let config = getReplayConfig(rootDir);
		var isValid = validateScriptConfig(script.options);
		if (!isValid) {
			return;
		}
		let file = path.resolve(rootDir, script.options["file"]);
		let dir = path.dirname(file);
		var vscFile: vscode.Uri = vscode.Uri.file(file);
		let dirExists = fs.existsSync(dir);
		if (!dirExists) {
			fs.mkdirSync(dir, { recursive: true });
		}
		let fileExists = fs.existsSync(file);
		let shouldFileEmpty = script.options["clean-file"] ? script.options["clean-file"] : false;
		if (fileExists) {
			if (shouldFileEmpty) {
				fs.writeFileSync(file, "", { encoding: 'utf8' });
			}
		} else {
			fs.writeFileSync(file, "", { encoding: 'utf8' });
		}
		await vscode.window.showTextDocument(vscFile);

		typeIt(script.content, new vscode.Position(0, 0));

		// vscode.window.activeTextEditor?.document.save();
		var t = 1;
	});
	context.subscriptions.push(disposable);
}

// this method is called when your extension is deactivated
export function deactivate() { }

function replaceAll(text: string, search: string, replacement: string): string {
	return text.split(search).join(replacement);
};

function readScript(filePath: string) {
	let cnt = fs.readFileSync(filePath, 'utf8');
	let gm = gmatter(cnt);
	let text = repeatSymbols(gm.content);
	text = removeBackSlashR(text);
	let rgx = /⨷\s*\n/gm;
	text = text.replace(rgx, '');
	return {
		content: text,
		options: gm.data as { [key: string]: string }
	};
}

function validateScriptConfig(options: { [key: string]: string }): boolean {
	if (!('file' in options)) {
		vscode.window.showErrorMessage(`You must set 'file' in your replay script file.`);
		return false;
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

function typeIt(text: string, pos: vscode.Position) {
	if (!text) { return; }
	if (text.length === 0) { return; }
	let editor = vscode.window.activeTextEditor;
	if (!editor) {
		return;
	}
	var _pos = pos;
	var char = text.substring(0, 1);
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
		var newSelection = new vscode.Selection(_pos, _pos);
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
			var delay = 20 + 80 * Math.random();
			if (Math.random() < 0.1) { delay += 250; }
			var _p = new vscode.Position(_pos.line, char.length + _pos.character);
			setTimeout(function () { typeIt(text.substring(1, text.length), _p); }, delay);
		});
}
