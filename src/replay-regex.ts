export function repeatSymbols(text: string): string {
    if (!text) {
        return "";
    }
    let regx = /(([↓⌫↑→←⮒⟿])([0-9]+))/gm;
    let matches = text.match(regx);
    if (matches) {
        for (let index = 0; index < matches.length; index++) {
            let block = matches[index];
            let sym = block[0].toString();
            let num = Number.parseInt(block.substring(1), 10);
            let rep = sym.repeat(num);
            text = text.replace(block, rep);
        }
    }
    return text;
}

export function checkCommands(text: string): { text: string, commands: string[] } {
    if (!text) {
        return { text, commands: [] };
    }
    let commands: string[] = [];
    let regx = /(⧉.*?\n)|(⧉.*?🔚)/gm;
    let matches = text.match(regx);
    if (matches) {
        for (let index = 0; index < matches.length; index++) {
            let cmd = matches[index];
            cmd = cmd.replace('🔚', '');
            commands.push(cmd.replace('⧉', '').replace('\n', '').replace(/\s/g, ""));
            text = text.replace(cmd, '⧉');
        }
    }
    return {
        text,
        commands: commands.reverse()
    };
}