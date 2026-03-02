import * as vscode from 'vscode';
import { execSync } from 'child_process';

export interface DiffOptions {
  scope: 'uncommitted' | 'branch';
  fileScope: 'all' | 'current';
}

export async function getDiff(options: DiffOptions): Promise<string> {
  // 1. Get workspace root
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    throw new Error('No workspace folder open. Open a project folder first.');
  }
  const cwd = workspaceFolders[0].uri.fsPath;

  // 2. Get current file path if fileScope is 'current'
  let filePath = '';
  if (options.fileScope === 'current') {
    const activeEditor = vscode.window.activeTextEditor;
    if (!activeEditor) {
      throw new Error('No file currently open. Open a file to review current file diff.');
    }
    filePath = activeEditor.document.uri.fsPath;
  }

  // 3. Build git command based on scope
  let command = '';
  if (options.scope === 'uncommitted') {
    command = filePath ? `git diff HEAD -- "${filePath}"` : 'git diff HEAD';
  } else {
    // branch vs main — try main first, fallback to master
    try {
      execSync('git rev-parse --verify main', { cwd, stdio: 'ignore' });
      command = filePath ? `git diff main...HEAD -- "${filePath}"` : 'git diff main...HEAD';
    } catch {
      command = filePath ? `git diff master...HEAD -- "${filePath}"` : 'git diff master...HEAD';
    }
  }

  // 4. Execute and return
  try {
    const diff = execSync(command, { cwd, encoding: 'utf8', maxBuffer: 1024 * 1024 * 10 });
    return diff.trim();
  } catch (error: any) {
    if (error.message.includes('not a git repository')) {
      throw new Error('This folder is not a git repository.');
    }
    throw new Error(`Git error: ${error.message}`);
  }
}
