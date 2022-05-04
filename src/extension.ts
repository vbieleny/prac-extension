import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import ProjectObservable from './observable';
import TestResult from './result';

export default class PracVsCodeExtension {
	static getWebViewContent(extensionPath: string): string {
		const pathToHtml = vscode.Uri.file(
			path.join(extensionPath, 'resources', 'analyze.html')
		);
		return fs.readFileSync(pathToHtml.fsPath, 'utf8');
	}

	createTask(id: string, name: string, command: string, group?: vscode.TaskGroup): vscode.Task {
		let taskScope: vscode.WorkspaceFolder | vscode.TaskScope = vscode.TaskScope.Workspace;
		if (vscode.workspace.workspaceFolders) {
			taskScope = vscode.workspace.workspaceFolders[0];
		}

		const task = new vscode.Task(
			{ type: "PRAC", task: id },
			taskScope,
			name,
			"PRAC",
			new vscode.ShellExecution(command),
			"$prac"
		);
		task.presentationOptions = { panel: vscode.TaskPanelKind.Dedicated };

		if (group) {
			task.group = group;
		}
		return task;
	}

	parsePracOutput(pracOutput: string): any {
		let algorithms: string[] = [];
		let results: TestResult[] = [];		

		let currentTestName: string = '';
		const lines = pracOutput.split(/\r\n|(?!\r\n)[\n-\r\x85\u2028\u2029]/);
		lines.forEach(line => {
			const segments = line.split(';');
			if (segments[0] === 'I') {
				algorithms = segments.slice(1);
			} else if (segments[0] === 'T') {
				currentTestName = segments[1];
			} else if (segments[0] === 'V') {
				for (let i = 2; i < segments.length; i += 2) {
					const result: TestResult = {
						testName: currentTestName,
						algorithm: algorithms[i / 2 - 1],
						parameters: segments[1],
						pageFaults: segments[i],
						overhead: segments[i + 1]
					};
					results.push(result);
				}
			} else if (segments[0] === 'E') {
				return results;
			}
		});
		return results;
	}

	activate(context: vscode.ExtensionContext) {
		let analyzePanel: vscode.WebviewPanel | undefined = undefined;

		const cleanTask = this.createTask('prac.task.clean', 'PRAC: Clean', 'make -C ./.prac clean', vscode.TaskGroup.Clean);
		const buildTask = this.createTask('prac.task.build', 'PRAC: Build', 'make -C ./.prac all', vscode.TaskGroup.Build);
		const runTask = this.createTask('prac.task.run', 'PRAC: Run', 'make -C ./.prac qemu-serial');
		const analyzeTask = this.createTask('prac.task.analyze', 'PRAC: Analyze', 'make -C ./.prac qemu-file');

		context.subscriptions.push(vscode.tasks.registerTaskProvider("PRAC", {
			provideTasks: (token: vscode.CancellationToken): vscode.ProviderResult<vscode.Task[]> => {
				return [cleanTask, buildTask, runTask, analyzeTask];
			},
			resolveTask: (task: vscode.Task, token: vscode.CancellationToken): vscode.ProviderResult<vscode.Task> => {
				return undefined;
			}
		}));

		const pracProjectDirs = ProjectObservable.getPracProjectDirs();
		console.log(`PRAC project dirs: ${pracProjectDirs}`);

		vscode.commands.registerCommand('prac-extension.clean', () => {
			vscode.tasks.executeTask(cleanTask);
		});
		vscode.commands.registerCommand('prac-extension.build', () => {
			vscode.tasks.executeTask(buildTask);
		});
		vscode.commands.registerCommand('prac-extension.run', () => {
			vscode.tasks.executeTask(runTask);
		});
		vscode.commands.registerCommand('prac-extension.analyze', () => {
			vscode.tasks.executeTask(analyzeTask);
		});

		vscode.tasks.onDidEndTaskProcess((event: vscode.TaskProcessEndEvent) => {
			if (event.execution.task.definition.task === 'prac.task.analyze' && event.exitCode === 0) {
				if (vscode.workspace.workspaceFolders) {
					const workspace = vscode.workspace.workspaceFolders[0];
					const pracOutputFile = path.join(workspace.uri.fsPath, '.prac', 'prac-output.out');
					const pracOutput = fs.readFileSync(pracOutputFile, 'utf8');

					if (analyzePanel) {
						analyzePanel.reveal();
					} else {
						analyzePanel = vscode.window.createWebviewPanel('analyzeView', "Analyze View", vscode.ViewColumn.Beside, { enableScripts: true });
						analyzePanel.webview.html = PracVsCodeExtension.getWebViewContent(context.extensionPath);
						analyzePanel.onDidDispose(() => analyzePanel = undefined, undefined, context.subscriptions);
					}

					const parsedPracOutput = this.parsePracOutput(pracOutput);
					analyzePanel.webview.postMessage(parsedPracOutput);
				}
			}
		});

		if (vscode.window.registerWebviewPanelSerializer) {
			vscode.window.registerWebviewPanelSerializer("analyzeView", {
				async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
					analyzePanel = webviewPanel;
					analyzePanel.webview.html = PracVsCodeExtension.getWebViewContent(context.extensionPath);
					analyzePanel.onDidDispose(() => analyzePanel = undefined, undefined, context.subscriptions);
				}
			});
		}

		if (pracProjectDirs.length <= 0) {
			return;
		}
	}

	deactivate() { }
}
