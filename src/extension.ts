import * as vscode from 'vscode';
import * as path from 'path';
import { spawn } from 'child_process';

const BACKEND_PATH_CONFIG = 'izuna-book-reader.backendPath';

let backendProcess: ReturnType<typeof spawn> | null = null;
let treeDataProvider: SidebarDataProvider | undefined;
let bookshelfPanel: vscode.WebviewPanel | undefined;

/**
 * 获取后端路径配置
 * @returns 后端路径，如果没有设置则返回空字符串
 */
function getBackendPath(): string {
    return vscode.workspace.getConfiguration().get(BACKEND_PATH_CONFIG, '');
}

/**
 * 设置后端路径配置
 * @param newPath - 新的后端路径
 */
async function setBackendPath(newPath: string): Promise<void> {
    await vscode.workspace.getConfiguration().update(BACKEND_PATH_CONFIG, newPath, vscode.ConfigurationTarget.Global);
}

/**
 * 检查后端路径是否有效
 * @param backendPath - 后端路径
 * @returns 是否有效
 */
function isBackendPathValid(backendPath: string): boolean {
    if (!backendPath || backendPath.trim() === '') {
        return false;
    }
    return true;
}

/**
 * 在编辑器中打开书架
 * 打开 http://localhost:2121/#/
 */
async function openBookshelf(): Promise<void> {
    const bookshelfUrl = 'http://localhost:2121/#/';
    
    if (bookshelfPanel) {
        bookshelfPanel.reveal();
        bookshelfPanel.webview.html = getBookshelfHtml(bookshelfUrl);
        vscode.window.showInformationMessage('已在编辑器中打开书架');
        return;
    }

    bookshelfPanel = vscode.window.createWebviewPanel(
        'izuna-bookshelf',
        '阅读书架',
        vscode.ViewColumn.One,
        {
            enableScripts: true,
            retainContextWhenHidden: true
        }
    );

    bookshelfPanel.webview.html = getBookshelfHtml(bookshelfUrl);
    
    bookshelfPanel.onDidDispose(() => {
        bookshelfPanel = undefined;
    });

    vscode.window.showInformationMessage('已在编辑器中打开书架');
}

/**
 * 获取书架的 HTML 内容
 * @param url - 书架 URL 地址
 * @returns HTML 字符串
 */
function getBookshelfHtml(url: string): string {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>阅读书架</title>
    <style>
        body { margin: 0; padding: 0; }
        iframe { width: 100%; height: 100vh; border: none; }
    </style>
</head>
<body>
    <iframe src="${url}"></iframe>
</body>
</html>`;
}

/**
 * 启动后端服务
 * 在后端路径执行 ./bin/startup.sh
 */
let isBackendRunning = false;

async function startBackend(): Promise<void> {
    const backendPath = getBackendPath();
    
    if (!isBackendPathValid(backendPath)) {
        const choice = await vscode.window.showWarningMessage(
            '后端地址未设置，是否现在设置？',
            '设置后端地址',
            '取消'
        );
        if (choice === '设置后端地址') {
            await setBackendPathCommand();
        }
        return;
    }

    const startupScript = path.join(backendPath, 'bin', 'startup.sh');
    
    try {
        isBackendRunning = true;
        refreshTreeView();
        
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: '启动后端',
            cancellable: false
        }, async () => {
            return new Promise<void>((resolve, reject) => {
                backendProcess = spawn('sh', [startupScript], {
                    cwd: backendPath,
                    shell: true,
                    stdio: 'ignore'
                });

                backendProcess.on('error', (err) => {
                    vscode.window.showErrorMessage(`启动后端失败: ${err.message}`);
                    isBackendRunning = false;
                    refreshTreeView();
                    reject(err);
                });

                backendProcess.on('spawn', () => {
                    vscode.window.showInformationMessage('后端已启动');
                    refreshTreeView();
                    resolve();
                });

                setTimeout(() => {
                    resolve();
                }, 3000);
            });
        });
    } catch (error) {
        isBackendRunning = false;
        refreshTreeView();
        vscode.window.showErrorMessage(`启动后端失败: ${error}`);
    }
}

/**
 * 关闭后端服务
 * 在后端路径执行 ./bin/shutdown.sh
 */
async function stopBackend(): Promise<void> {
    const backendPath = getBackendPath();
    
    if (!isBackendPathValid(backendPath)) {
        vscode.window.showWarningMessage('后端地址未设置');
        return;
    }

    const shutdownScript = path.join(backendPath, 'bin', 'shutdown.sh');
    
    try {
        isBackendRunning = false;
        refreshTreeView();
        
        await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: '关闭后端',
            cancellable: false
        }, async () => {
            return new Promise<void>((resolve) => {
                const process = spawn('sh', [shutdownScript], {
                    cwd: backendPath,
                    shell: true,
                    stdio: 'ignore'
                });

                process.on('error', (err) => {
                    vscode.window.showErrorMessage(`关闭后端失败: ${err.message}`);
                    resolve();
                });

                process.on('close', () => {
                    vscode.window.showInformationMessage('后端已关闭');
                    refreshTreeView();
                    resolve();
                });

                setTimeout(() => {
                    resolve();
                }, 3000);
            });
        });
    } catch (error) {
        vscode.window.showErrorMessage(`关闭后端失败: ${error}`);
    }
}

/**
 * 设置后端地址命令
 * 允许用户输入或选择后端路径
 */
async function setBackendPathCommand(): Promise<void> {
    const currentPath = getBackendPath();
    
    const result = await vscode.window.showInputBox({
        prompt: '请输入后端文件所在地址',
        value: currentPath,
        placeHolder: '例如: /Users/izuna/Documents/vscode/backend',
        validateInput: (value) => {
            if (!value || value.trim() === '') {
                return '后端地址不能为空';
            }
            return null;
        }
    });

    if (result !== undefined) {
        await setBackendPath(result);
        vscode.window.showInformationMessage(`后端地址已设置为: ${result}`);
        refreshTreeView();
    }
}

/**
 * 刷新树视图
 */
function refreshTreeView(): void {
    if (treeDataProvider) {
        treeDataProvider.refresh();
    }
}

/**
 * 侧边栏数据项
 */
class SidebarItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly command: vscode.Command,
        public readonly iconPath?: vscode.Uri | { light: vscode.Uri; dark: vscode.Uri } | vscode.ThemeIcon
    ) {
        super(label, vscode.TreeItemCollapsibleState.None);
        this.command = command;
        this.iconPath = iconPath;
    }
}

/**
 * 侧边栏数据提供者
 */
class SidebarDataProvider implements vscode.TreeDataProvider<SidebarItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<SidebarItem | undefined | void>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: SidebarItem): vscode.TreeItem {
        return element;
    }

    getChildren(): SidebarItem[] {
        const backendPath = getBackendPath();
        const isValid = isBackendPathValid(backendPath);
        
        const items: SidebarItem[] = [
            new SidebarItem(
                '📚 打开书架',
                {
                    command: 'izuna-book-reader.openBookshelf',
                    title: '打开书架',
                    arguments: []
                },
                new vscode.ThemeIcon('book')
            )
        ];

        if (isValid) {
            if (isBackendRunning) {
                items.push(new SidebarItem(
                    '⏹ 关闭后端',
                    {
                        command: 'izuna-book-reader.stopBackend',
                        title: '关闭后端',
                        arguments: []
                    },
                    new vscode.ThemeIcon('debug-stop')
                ));
            } else {
                items.push(new SidebarItem(
                    '▶ 启动后端',
                    {
                        command: 'izuna-book-reader.startBackend',
                        title: '启动后端',
                        arguments: []
                    },
                    new vscode.ThemeIcon('play')
                ));
            }
        }

        items.push(new SidebarItem(
            '⚙ 设置后端地址',
            {
                command: 'izuna-book-reader.setBackendPath',
                title: '设置后端地址',
                arguments: []
            },
            new vscode.ThemeIcon('settings-gear')
        ));

        return items;
    }
}

/**
 * 激活扩展时被调用
 * @param context - 扩展上下文
 */
export function activate(context: vscode.ExtensionContext): void {
    console.log('阅读3.0服务器版插件已激活');

    // 注册命令
    const openBookshelfCmd = vscode.commands.registerCommand('izuna-book-reader.openBookshelf', async () => {
        await openBookshelf();
    });

    const startBackendCmd = vscode.commands.registerCommand('izuna-book-reader.startBackend', async () => {
        await startBackend();
    });

    const stopBackendCmd = vscode.commands.registerCommand('izuna-book-reader.stopBackend', async () => {
        await stopBackend();
    });

    const setBackendPathCmd = vscode.commands.registerCommand('izuna-book-reader.setBackendPath', async () => {
        await setBackendPathCommand();
    });

    // 创建侧边栏树视图
    treeDataProvider = new SidebarDataProvider();
    const treeView = vscode.window.createTreeView('izuna-book-reader-view', {
        treeDataProvider: treeDataProvider,
        showCollapseAll: false
    });

    // 添加到订阅
    context.subscriptions.push(
        openBookshelfCmd,
        startBackendCmd,
        stopBackendCmd,
        setBackendPathCmd,
        treeView
    );
}

/**
 * 停用扩展时被调用
 */
export function deactivate(): void {
    if (backendProcess) {
        backendProcess.kill();
        backendProcess = null;
    }
    if (bookshelfPanel) {
        bookshelfPanel.dispose();
        bookshelfPanel = undefined;
    }
}
