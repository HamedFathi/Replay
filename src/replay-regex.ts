export function repeatSymbols(text: string): string {
    let regx = /(([↓⌫↑→←])([0-9]+))/gm;
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


