'use strict';

import * as vscode from 'vscode';
import * as redis from 'ioredis';

// const HOST = require('os').networkInterfaces().eth0[0].address;
const HOST = 'localhost';
const PORT = 6380;
let REDIS_SERVER: string | object = `redis://${HOST}:${PORT}`;

const use_ioredis = true;

if (use_ioredis) {
  REDIS_SERVER = {
    host: HOST,
    port: PORT,
    // password: 'rahasia'
  };
}

const publisher_connection = redis.createClient(REDIS_SERVER);
const subsciber_connection = redis.createClient(REDIS_SERVER);

const channel_name = 'ulang';
const reply_channel_from_server = 'ulang/fromserver';
const reply_from_search_service = 'ulang/search_service';
const reply_from_fastmapper = 'ulang/mapper_service';

/**
 * bikin 3 jenis insert
 * insert di next line
 *      editBuilder.insert(endpos, `\n${text}`);
 * ini utk standard -> repl
 * 
 * insert after cursor
 *      editBuilder.insert(endpos, text);
 * ini kurang berguna
 * 
 * replace
 *      editBuilder.replace(selection, text);
 * ini utk /<something> -> redis repl
 */

// async function getReplacingMode() {
//   publisher_connection.get('ulangreplace', function (err, reply) {
//     if (reply == false) { // '0'
//       return false;
//     }
//     return true; // '1'
//   });
// }


function insertEditor(text: string, replacing=false) {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const document = editor.document;
    const selection = editor.selection;

    let startingpos: vscode.Position;
    if (selection.isEmpty) {
      startingpos = selection.active;
    } else {
      startingpos = selection.end;
    }
    const baris = document.lineAt(startingpos);
    // let endpos = baris.rangeIncludingLineBreak.end;
    const endpos = baris.range.end;
    const awalbaris = baris.range.start;
    
    editor.edit(editBuilder => {
      if (replacing) {
        // dari redis repl dg /twilio
        if (selection.isEmpty) {
          if (text.length > 0 && text.trim()) {
            // jk gak ada selection, select mulai awal baris utk replace
            // jk text kosong, kita tidak lakukan apa2
            // jk text whitespace, jg lakukan apa2
            const newSelection = new vscode.Selection(awalbaris, endpos);
            editBuilder.replace(newSelection, text);
          }
        } else {
          editBuilder.replace(selection, text);
        }
      } else {
        // dari repl dg fmedia`PIL~open dst
        editBuilder.insert(endpos, `\n${text}`);
      }
      var newSelection = new vscode.Selection(endpos, endpos);
      editor.selection = newSelection;
    });
  }
}


function replaceEditor(text: string, replacing=true) {
  const editor = vscode.window.activeTextEditor;
  if (editor) {
    const document = editor.document;
    const selection = editor.selection;

    let startingpos: vscode.Position;
    if (selection.isEmpty) {
      startingpos = selection.active;
    } else {
      startingpos = selection.end;
    }
    const baris = document.lineAt(startingpos);
    // const endpos = baris.rangeIncludingLineBreak.end;
    const endpos = baris.range.end;
    // const awalbaris = baris.range.start;
    const wordRange = editor.document.getWordRangeAtPosition(editor.selection.start);
    let awalkata: vscode.Position;
    let akhirkata: vscode.Position;
    if (wordRange) {
      awalkata = wordRange.start;
      akhirkata = wordRange.end;
    } else {
      awalkata = selection.start;
      akhirkata = endpos;
    }
    
    editor.edit(editBuilder => {
      if (replacing) {
        // dari redis repl dg /twilio
        if (selection.isEmpty) {
          if (text.length > 0 && text.trim()) {
            // jk gak ada selection, select mulai awal baris utk replace
            // jk text kosong, kita tidak lakukan apa2
            // jk text whitespace, jg lakukan apa2
            // let newSelection = new vscode.Selection(awalbaris, endpos);
            // let newSelection = new vscode.Selection(awalkata, endpos);
            const newSelection = new vscode.Selection(awalkata, akhirkata);
            editBuilder.replace(newSelection, text);
          }
        } else {
          editBuilder.replace(selection, text);
        }
      }
      // gak perlu bikin selection
      // var newSelection = new vscode.Selection(endpos, endpos);
      // editor.selection = newSelection;
    });
  }
}


function redis_subscribe(channel: string) {
  /**
   * 
   * filename: vscode.window.activeTextEditor?.document.fileName,
   * fsPath: vscode.window.activeTextEditor?.document.uri.fsPath,
   * 
  origmeta: {
    "metaWorkspacesFspath":["/home/usef/danger/ulib/schnell"],
    const metaWorkspacesFspath = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath);

    "metaWorkspacesPath":["/home/usef/danger/ulib/schnell"],
    const metaWorkspacesPath = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.path);
    
    "metaDocument":
    {
      "filename":"/tmp/hilang7.txt",
      filename: vscode.window.activeTextEditor?.document.fileName,

      "fsPath":"/tmp/hilang7.txt",
      const fsPath = vscode.window.activeTextEditor?.document.uri.fsPath;

      "path":"/tmp/hilang7.txt",
      path: vscode.window.activeTextEditor?.document.uri.path,

      "language":"plaintext"
      language: vscode.window.activeTextEditor?.document.languageId,
    }
  }
  */

  subsciber_connection.subscribe(channel);

  subsciber_connection.on('message', function(topic: string, message: string) {

    // const orange = vscode.window.createOutputChannel("Orange");
    // const kalimat1 = `channel ${topic} receives message ${message}.`;
    // orange.appendLine(kalimat1);

    const data = JSON.parse(message);
    const text = data.content;
    const meta = data.meta;
    const original_meta = data.original;
    const banding1_datang = String(original_meta.metaWorkspacesFspath);
    const banding2_datang = String(original_meta.metaDocument.filename);
    // const banding3_datang = vscode.window.activeTextEditor?.document.languageId;


    const banding1 = String(vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath));
    if (banding1 != banding1_datang) {
      // orange.appendLine(`1) [${banding1}] [${typeof(banding1)}] tidak sama dengan [${banding1_datang}] [${typeof(banding1_datang)}]`);
      return;
    }
    // filename, fspath, path, semua sama
    const banding2 = String(vscode.window.activeTextEditor?.document.fileName);
    if (banding2 != banding2_datang) {
      // orange.appendLine(`2) [${banding2}] tidak sama dengan [${banding2_datang}]`);
      return;
    }

    // let kalimat2 = `
    // topic: ${topic}
    // message: message
    // data: JSON.stringify(data)
    // meta: ${JSON.stringify(meta)}
    // origmeta: ${JSON.stringify(original_meta)}
    //     :: perbandingan ::
    // datang:
    // banding1_datang = ${banding1_datang}
    // banding2_datang = ${banding2_datang}
    // curdoc:
    // banding1 = ${banding1}
    // banding2 = ${banding2}
    //     `;    
    // orange.appendLine(kalimat2);
    // orange.show();


    // const metaWorkspacesFspath = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath);
    // const fsPath = vscode.window.activeTextEditor?.document.uri.fsPath;
    // // jika document yg berbeda, jangan proses
    // if (original_meta.metaWorkspacesFspath !== metaWorkspacesFspath &&
    //   original_meta.metaDocument.fsPath !== fsPath) {
    //   return;
    // } else {
    //   console.log(`
    //   original_meta.metaWorkspacesFspath  = ${original_meta.metaWorkspacesFspath}
    //   original_meta.metaDocument.fsPath   = ${original_meta.metaDocument.fsPath}
    //   metaWorkspacesFspath                = ${metaWorkspacesFspath}
    //   fsPath                              = ${fsPath}
    //   `);
    // }

    // f@c
    if (topic === reply_channel_from_server) {      
      publisher_connection.get('ulangreplace', function (err:any, reply:any) {
        if (reply !== null && reply.toString() === '0') { // '0'
          // return false;
          insertEditor(text);
        }
        // return true; // '1'
        insertEditor(text, true); // replacing...
      });
    }

    // ^n
    else if (topic === reply_from_fastmapper) {
      if (text.trim().length < 1 && meta) {
        // vscode.window.showInformationMessage(`Terima: ${meta}`);
        if (Array.isArray(meta)) {
          vscode.window.showQuickPick(meta, {
            placeHolder: meta[0]
          }).then(selection => {
            if (!selection) {
              return;
            }            
            redis_publish_data(selection, true);
          });
        }
      } else {
        replaceEditor(text);
      }
    }
    // /searchterm
    else if (topic === reply_from_search_service) {
      // insertEditor(text, true);

      if (text.trim().length < 1 && meta) {
        // myredis.py:523
        if (meta.hasOwnProperty('keys')) {
          vscode.window.showQuickPick(meta.keys, {
            placeHolder: meta.keys[0]
          }).then(selection => {
            if (!selection) {
              return;
            }            
            redis_publish_data(selection);
          });
        }
      } else {
        insertEditor(text, true);
      }
    }
  });

}


function redis_publish(data: object, channel: string = channel_name) {
  const message = JSON.stringify(data);
  // console.log(`[1/3] trying to publish: ${message} to ${channel}.`);
  publisher_connection.publish(
    channel, 
    message, 
    function() {
      console.log(`     
        ******
        [2/3] Publishing: [${message}].
        HOST = ${HOST}
        ******
      `);
    }
  );
  // console.log(`[3/3] completing publishing: ${message} to ${channel}.`);
}


redis_subscribe(reply_channel_from_server);
redis_subscribe(reply_from_search_service);
redis_subscribe(reply_from_fastmapper);

// import WebSocket from "ws";
// let socket: WebSocket = new WebSocket('ws://localhost:9008');
// socket.on('open', function open() {
//   console.log(`connecting to server...`);
//   socket.send(
//     JSON.stringify({pesan: 'data pertama'})
//   );
// });
// socket.on('message', function incoming(data: any) {
//   console.log(`terima data dari server:`, JSON.stringify(data));
// });


function redis_publish_data(wordText: string, fastmapper=false) {
  const metaWorkspacesFspath = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath);
  const metaWorkspacesPath = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.path);
  const metaDocument = {
    filename: vscode.window.activeTextEditor?.document.fileName,
    fsPath: vscode.window.activeTextEditor?.document.uri.fsPath,
    path: vscode.window.activeTextEditor?.document.uri.path,
    scheme: vscode.window.activeTextEditor?.document.uri.scheme,
    language: vscode.window.activeTextEditor?.document.languageId,
  };
  const data = {
    content: (fastmapper ? 'fastmapper:' : '') + wordText,
    meta: {
      metaWorkspacesFspath,
      metaWorkspacesPath,
      metaDocument,
    }
  };
  redis_publish(data);
}


export function activate(context: vscode.ExtensionContext) {

	context.subscriptions.push(vscode.commands.registerCommand('ulang.fastMapper', () => {

		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const wordRange = editor.document.getWordRangeAtPosition(editor.selection.start);
			const wordText = editor.document.getText(wordRange);
			const metaWorkspacesFspath = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath);
      const metaWorkspacesPath = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.path);
      const metaDocument = {
        filename: vscode.window.activeTextEditor?.document.fileName,
        fsPath: vscode.window.activeTextEditor?.document.uri.fsPath,
        path: vscode.window.activeTextEditor?.document.uri.path,
        language: vscode.window.activeTextEditor?.document.languageId,
      };
			const data = {
        content: 'fastmapper:' + wordText,
        meta: {
          metaWorkspacesFspath,
          metaWorkspacesPath,
          metaDocument,
        }
      };
			redis_publish(data);
		}
	}));

	const disposable = vscode.commands.registerCommand('ulang.selectRange', function () {

		const editor = vscode.window.activeTextEditor;
		if (editor) {
			const document = editor.document;
			const selection = editor.selection;
			const word = document.getText(selection);

      // const metaFileName = vscode.window.activeTextEditor?.document.fileName;
      const metaWorkspacesFspath = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath);
      const metaWorkspacesPath = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.path);
      const metaDocument = {
        filename: vscode.window.activeTextEditor?.document.fileName,
        fsPath: vscode.window.activeTextEditor?.document.uri.fsPath,
        path: vscode.window.activeTextEditor?.document.uri.path,
        language: vscode.window.activeTextEditor?.document.languageId,
      };
      const data = {
        content: word,
        meta: {
          metaWorkspacesFspath,
          metaWorkspacesPath,
          metaDocument,
        }
      };
			redis_publish(data);
		}
	});

  context.subscriptions.push(disposable);

  context.subscriptions.push(
    vscode.commands.registerCommand('ulang.selectLine', function () {

      const editor = vscode.window.activeTextEditor;
      if (editor) {
        // console.log(`process line: YES editor...`);
        const document = editor.document;
        const selection = editor.selection;
        // const word = document.getText(selection);
        const { text } = document.lineAt(selection.active.line);

        const metaWorkspacesFspath = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.fsPath);
        const metaWorkspacesPath = vscode.workspace.workspaceFolders?.map((folder) => folder.uri.path);
        const metaDocument = {
          filename: vscode.window.activeTextEditor?.document.fileName,
          fsPath: vscode.window.activeTextEditor?.document.uri.fsPath,
          path: vscode.window.activeTextEditor?.document.uri.path,
          language: vscode.window.activeTextEditor?.document.languageId,
        };
        const data = {
          content: text,
          meta: {
            metaWorkspacesFspath,
            metaWorkspacesPath,
            metaDocument,

          }
        };
        // console.log(`process line, data:
        //   ${JSON.stringify(data, null, 2)}
        // `);
        redis_publish(data);
      }
    })
  );
}
