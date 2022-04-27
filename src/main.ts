import * as vscode from 'vscode';
import PracVsCodeExtension from './extension';

export const extension = new PracVsCodeExtension();

export function activate(context: vscode.ExtensionContext) {
	extension.activate(context);
	return extension;
}

export function deactivate() {
	extension.deactivate();
}
