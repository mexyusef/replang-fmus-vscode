# Vscode extension for Repl language

Replang vscode extension is an extension to work with Replang server.

Replang server contains a Redis Pubsub which will listen for request on a channel (A) and send the response back to a different channel (B).

This vscode extension will publish to channel (A) and subscribe to channel (B).

In the following screenshot, we can type any replang code (fM, ff, f@c, fl, /pattern-to-search etc) and they will be replaced by the response given by the server.

![Replang vscode in action](images/replang-vscode.gif "Replang")
