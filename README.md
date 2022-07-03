![replay](https://user-images.githubusercontent.com/8418700/174631473-a25f3eb1-3a97-468b-b574-6f50718db4dc.gif)

# vscode-replay

Live coding is the best way for teaching and share your knowledge with others but as you know this is not easy! The idea behind writing this extension is to have live coding with hundred percent accuracy and less stressful moments!

You can achieve the goal in two different ways:

1. Recording everything via macros.
2. Replay a pre-defined script.

For the first approach, it is fast but not accurate because you are recording your mistakes too, so, I am using the second one to nail it! 

## Features

You have full control of the script that you want to type:

* Move the cursor in any direction and number you want.
* Using predefined utility commands to simplify the typing process.
* Calling commands available in VS Code e.g Format the document by `editor.action.formatDocument`.
* Present your code perfectly with manual and automatic pause/resume cycle.

## Usage



### Operational Characters

|  | Name | Description |
|:---------:|------|-------------|
| ↑         | Up            | Move the cursor up one line |
| ↓         | Down          | Move the cursor down one line |
| →         | Right         | Move the cursor right one character |
| ←         | Left          | Move the cursor left one character |
| ⤒         | First         | Move the cursor to the beginning of the first line |
| ⤓         | Last          | Move the cursor to the beginning of the last line |
| ⇤        | Begin         | Move the cursor to the beginning of the line |
| ⇥        | End           | Move the cursor to the end of the line |
|⮒         | Newline       |  Adding a new line |
|⨷        | Remove Newline |  removng next new line      |
|⟿        | Whitespace     |  Adding a whitespace |
| ⌫       | Backspace      | Delete the character to the left of the cursor |
|⭯         | Pause         | Pause the running process and ask user to continue via dialog |
|⧉        | Command        |  Adding some useful functionality to your script     |

You can use number after the below operational characters to write less repetetive code:

|  | Name | Description |
|:---------:|------|-------------|
| ↑2         | Up More        | Move the cursor up {N} lines |
| ↓10         | Down More      | Move the cursor down {N} lines |
| →5         | Right More     | Move the cursor right {N} characters |
| ←7         | Left More      | Move the cursor left {N} characters |
| ⮒3       | Newline More      | Adding {N} new lines |
|⟿4        | Whitespace More     |  Adding {N} whitespace |
| ⌫8       | Backspace More      | Delete {N} characters to the left of the cursor |
| ⭯6       | Pause More      | Pause for {N} seconds |

If you set `0` for the count, the extension automatically consider it as `1`.
### Commands

|  | Name | Description |
|:---------|------|------|
| ⧉ goto:1:5 |goto| go to the specified line and column, you can use `eol` for end of line |
| ⧉ delete:1 |delete-line|delete whole content of the line and line itself|
| ⧉ empty:1 |empty-line|delete whole content of the line but keep the line empty, move the cursor to the beginning of the line|
| ⧉ delete-after:1:5|delete-after| delete characters after the specified line and column, column {N} also deletes |
| ⧉ delete-before:1:5|delete-before| delete characters before the specified line and column, column {N} also deletes |
| ⧉ delete-area:1:5:2:9|delete-area| delete characters of the specified positions, you can use `eol` for end of line |
| ⧉ delete-all |delete-all|delete whole content|
| ⧉ execute:editor.action.formatDocument |execute|execute the specified command of VS Code.|
| ⧉ duplicate-line-after:1|duplicate-line-after| duplicate the line after it |
| ⧉ duplicate-line-before:1|duplicate-line-before| duplicate the line before it |
| ⧉ copy:1:5:2:14 |copy| copy the specified line and column, you can use `eol` for end of line |
| ⧉ cut:3:4:6:eol |cut| cut the specified line and column, you can use `eol` for end of line  |
| ⧉ paste:6:5:7:20 |paste| paste the specified line and column, you can use `eol` for end of line  |
| ⧉ waitn:10 <br/> ⧉ waitn:10:comment |waitn| waiting for {N} seconds with a comment if you set |
| ⧉ wait <br/> ⧉ wait:comment |wait| Showing a Yes/No dialog with a comment if you set |

### Settings


### Snippets

![snippets](https://user-images.githubusercontent.com/8418700/177030529-5a717407-166e-4916-988c-f5b1b6dc3e50.png)
## Extension Settings

Include if your extension adds any VS Code settings through the `contributes.configuration` extension point.

For example:

This extension contributes the following settings:

* `myExtension.enable`: enable/disable this extension
* `myExtension.thing`: set to `blah` to do something

## Release Notes
### 1.0.0

The first release.
