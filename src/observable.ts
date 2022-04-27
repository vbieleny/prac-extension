import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export default class ProjectObservable {
    static isPracProjectSync(projectDir: string): boolean {
        try {
            fs.accessSync(path.join(projectDir, 'prac.ini'));
            return true;
        } catch (err) {
            // Do nothing
        }
        return false;
    }

    static getPracProjectDirs(): string[] {
        return (vscode.workspace.workspaceFolders || [])
			.map((directory: vscode.WorkspaceFolder) => directory.uri.fsPath)
			.filter((projectDirectory: string) => ProjectObservable.isPracProjectSync(projectDirectory));
    }
}