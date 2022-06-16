| Operational Character | Name | Description |
|:---------:|------|-------------|
| ↓         | Down      | Move the cursor down one line |
| ↑         | Up        | Move the cursor up one line |
| ⤒         | First  | Move the cursor to the beginning of the first line |
| ⤓         | Last | Move the cursor to the beginning of the last line |
| →         | Right     | Move the cursor right one character |
| ←         | Left      | Move the cursor left one character |
| ⇥        | End | Move the cursor to the end of the line |
| ⇤        | Begin  | Move the cursor to the beginning of the line |
|⟿        | Whitespace         |  Adding a whitespace |
|⮒         | Newline |  Adding a new line |
| ⌫       | Backspace       | Delete the character to the left of the cursor |
|⭯         | Pause           | Pause the running process and ask user to continue via dialog |
|⧉        | Command         |  Adding some useful functionality to your script     |
|⨷        | Remove Newline         |  removng next new line      |

You can use number after the below characters to write less repetetive code:

| Operational Character | Name | Description |
|:---------:|------|-------------|
| ↓10         | Down More      | Move the cursor down 10 lines |
| ↑2         | Up More        | Move the cursor up 2 lines |
| →5         | Right More     | Move the cursor right 5 characters |
| ←7         | Left More      | Move the cursor left 5 characters |
| ⌫8       | Backspace More      | Delete 8 characters to the left of the cursor |
| ⭯6       | Pause More      | Pause for N seconds |
| ⮒3       | Newline More      | Adding N new lines |
|⟿4        | Whitespace More     |  Adding N whitespace |

There are a lot of commands this tool supports:

| Command | Description |
|:---------|------|
| ⧉ goto:1:5 | go to the specified line and column, you can use `eol` for end of line |
| ⧉ delete:1 |delete whole content of the line and line itself|
| ⧉ empty:1 |delete whole content of the line but keep the line empty, move the cursor to the beginning of the line|
| ⧉ delete-after:1:5| delete characters after the specified line and column |
| ⧉ delete-before:1:5| delete characters before the specified line and column |
| ⧉ delete-area:1:5:2:9| delete characters of the specified positions |
| ⧉ shortcut:CTRL K,D |running the specified shortcut of VS Code.|
| ⧉ duplicate-after:1| duplicate the line after it |
| ⧉ duplicate-before:1| duplicate the line before it |
| ⧉ copy:1:5:2:14:paste:6:5:7:20 | copy & paste the specified line and column, you can use `eol` for end of line |
| ⧉ cut:3:4:6:13:paste:6:5:7:20 | cut & paste the specified line and column, you can use `eol` for end of line  |
| ⧉ wait:10:false:comment | waiting for N seconds, if true shows countdown in the vscode as a tiny dialog with a comment/title if you set |

The structure of a command is like

`⧉ verb:variable1:valieble2:...:variableN`

The structure of a command is like

`⧉ verb:variable1:valieble2:...:variableN`

A `Command` always should use in a separate line so you cannot mix them with the other texts.

* `.vscreplay` is the extension.
* `config.vscreplay.js` is the file you can add your custom commands & options globaly.

`front-matter` for configs per file

```
---
file: scripts/app.js // looking for the file or creating
start-line: 46 // typing will start from this line
start-col:0 // typing will start from this column
start-position: top/bottom // typing will start from top of page or bottom
type-speed:10 // controlling typing speed test
backspace-speed:20 // controlling typing backspace
start-fresh:true // clear the file's content if it is true, just modify the current file if false
next-script:./../FILE.vscreplay // calling the other file to make a chain call
---

...
```

`config.vscreplay.js`

```
{
  basePath: "src",
  paths: {
            "@app/*": ["app/*"],
            "@config/*": ["app/_config/*"],
            "@environment/*": ["environments/*"],
            "@shared/*": ["app/_shared/*"],
            "@helpers/*": ["helpers/*"]
        }, // usage '@config/index';
  ...
}
```

# TODO

* Name of all .vscreplay files in whole project should be unique.
* Saving cursor posion in pause or deactiving the windows, ask for continue.
* Adding snippet for all commands & chars:
    * vsplay-down
    * vsplay-down-more
    * vsplay-up    
    * vsplay-up-more
    * vsplay-first
    * vsplay-last
    * vsplay-right
    * vsplay-right-more
    * vsplay-left
    * vsplay-left-more
    * vsplay-start
    * vsplay-end
    * vsplay-backspace
    * vsplay-backspace-more
    * vsplay-pause
    * vsplay-command
    * vsplay-goto
    * vsplay-delete-line
    * vsplay-delete-after
    * vsplay-delete-before
    * vsplay-shortcut
    * vsplay-duplicate-after
    * vsplay-duplicate-before
    * vsplay-copy
    * vsplay-cut
    * vsplay-paste
    * vsplay-call
    * vsplay-wait
    * vsplay-config
    * vsplay-config
