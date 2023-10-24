"use strict";

exports.activate = function() {
    // Do work when the extension is activated
};

exports.deactivate = function() {
    // Clean up temporary files before the extension is deactivated
    try {
        const tempFiles = nova.fs.listdir(nova.fs.tempdir);
        for (let i = 0; i < tempFiles.length; i++) {
            const fileName = nova.path.basename(tempFiles[i]); // just in case
            if (!fileName.startsWith(".")) {
                nova.fs.remove(nova.path.join(nova.fs.tempdir, fileName));
            }
        }
    } catch {
        // go ahead
    }
};


/**
 * Register Command Handlers
 */

nova.commands.register("maxgrafik.Convert.Base64Encode", editor => {
    convert(editor, Base64Encode);
});

nova.commands.register("maxgrafik.Convert.Base64Decode", editor => {
    convert(editor, Base64Decode);
});

nova.commands.register("maxgrafik.Convert.Base64EncodeFile", editor => {
    nova.workspace.showFileChooser("", {
        allowFiles: true,
        allowMultiple: false
    }, (result) => {
        if (result) {
            const filePath = result[0];
            if (nova.fs.access(filePath, nova.fs.F_OK + nova.fs.R_OK)) {
                const fileObj = nova.fs.open(filePath, "r+b");
                const buffer = fileObj.read();
                fileObj.close();

                const byteArray = new Uint8Array(buffer);
                const base64 = Base64EncodeFile(byteArray);

                editor.insert(base64);
            }
        }
    });
});

nova.commands.register("maxgrafik.Convert.Base64DecodeFile", editor => {

    const text = editor.selectedText.replace(/[ \t\n\f\r]/g, "");

    try {
        const buffer = Base64DecodeFile(text);

        const fileName = nova.crypto.randomUUID();
        const fileExtension = guessFileType(buffer);

        let filePath = "";

        if (fileExtension !== "") {
            filePath = nova.path.join(nova.fs.tempdir, fileName + fileExtension);
            saveFile(filePath, buffer);

        } else {
            nova.workspace.showFileChooser("", {
                prompt: "Save",
                allowFiles: false,
                allowFolders: true,
                allowMultiple: false
            }, (result) => {
                if (result) {
                    filePath = nova.path.join(result[0], fileName);
                    saveFile(filePath, buffer);
                }
            });
        }
    } catch (error) {
        nova.workspace.showInformativeMessage(error);
    }
});

nova.commands.register("maxgrafik.Convert.URLEncode", editor => {
    convert(editor, URLEncode);
});

nova.commands.register("maxgrafik.Convert.URLDecode", editor => {
    convert(editor, URLDecode);
});

nova.commands.register("maxgrafik.Convert.Ascii2Hex", editor => {
    convert(editor, Ascii2Hex);
});

nova.commands.register("maxgrafik.Convert.Hex2Ascii", editor => {
    convert(editor, Hex2Ascii);
});

nova.commands.register("maxgrafik.Convert.Ascii2Binary", editor => {
    convert(editor, Ascii2Binary);
});

nova.commands.register("maxgrafik.Convert.Binary2Ascii", editor => {
    convert(editor, Binary2Ascii);
});

nova.commands.register("maxgrafik.Convert.Rot13", editor => {
    convert(editor, Rot13);
});


/**
 * Helper functions
 */

function convert(editor, fn) {

    const selectedRanges = editor.selectedRanges.reverse();

    editor.edit(function(e) {
        for (const range of selectedRanges) {
            const text = editor.getTextInRange(range).trim();

            try {
                const newText = fn(text);
                e.replace(range, newText);
            } catch (error) {
                nova.workspace.showInformativeMessage(error);
            }
        }
    });
}

function saveFile(filePath, data) {
    if (filePath !== "") {
        const fileObj = nova.fs.open(filePath, "w+b");
        fileObj.write(data);
        fileObj.close();

        if (nova.path.extname(filePath) !== "") {
            nova.workspace.openFile(filePath);
        }
    }
}

function guessFileType(data) {

    const header = new Uint8Array(data, 0, 4);

    if (
        header[0] === 0x89 &&
        header[1] === 0x50 &&
        header[2] === 0x4E &&
        header[3] === 0x47
    ) {
        return ".png";
    }

    if (
        header[0] === 0xFF &&
        header[1] === 0xD8
    ) {
        return ".jpg";
    }

    if (
        header[0] === 0x47 &&
        header[1] === 0x49 &&
        header[2] === 0x46
    ) {
        return ".gif";
    }

    return "";
}


/**
 * Converter functions
 */

function Base64Encode(text) {
    return btoa(text);
}

function Base64Decode(text) {
    return atob(text.replace(/[ \t\n\f\r]/g, ""));
}


// Based on https://github.com/mathiasbynens/mothereff.in

function URLEncode(text) {
    return encodeURIComponent(text).replace(/['()_*]/g, character => {
        return "%" + character.charCodeAt().toString(16);
    });
}

function URLDecode(text) {
    return decodeURIComponent(text.replace(/\+/g, " "));
}

function Ascii2Hex(text) {

    const encoder = new TextEncoder();
    const buffer = encoder.encode(text);
    const byteArray = new Uint8Array(buffer);
    const hex = [];

    byteArray.forEach(charCode => {
        hex.push(charCode.toString(16).toUpperCase());
    });

    return hex.join(" ");
}

function Hex2Ascii(text) {

    const regex = /^(\s*[0-9A-Fa-f]{2}\s*)*$/;

    if (!regex.test(text)) {
        throw new Error("Not a HEX string");
    }

    const byteArray = Array.from(text.matchAll(/\s*[0-9A-Fa-f]{2}\s*/g), m => {
        return parseInt(m[0], 16);
    });

    const decoder = new TextDecoder();
    return decoder.decode(new Uint8Array(byteArray));
}

function Ascii2Binary(text) {

    const zeroPad = function(number) {
        return "00000000".slice(String(number).length) + number;
    };

    const encoder = new TextEncoder();
    const buffer = encoder.encode(text);
    const byteArray = new Uint8Array(buffer);
    const binary = [];

    byteArray.forEach(charCode => {
        binary.push(zeroPad(charCode.toString(2)));
    });

    return binary.join(" ");
}

function Binary2Ascii(text) {

    const regex = /^(\s*[01]{8}\s*)*$/;

    if (!regex.test(text)) {
        throw new Error("Not a binary string");
    }

    const byteArray = Array.from(text.matchAll(/\s*[01]{8}\s*/g), m => {
        return parseInt(m[0], 2);
    });

    const decoder = new TextDecoder();
    return decoder.decode(new Uint8Array(byteArray));
}


// https://stackoverflow.com/a/617685

function Rot13(text) {
    return text.replace(/[a-zA-Z]/g, c => {
        return String.fromCharCode((c<="Z"?90:122)>=(c=c.charCodeAt(0)+13)?c:c-26);
    });
}


// Adapted from https://github.com/jsdom/abab

function Base64EncodeFile(data) {

    const keystr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const btoaLookup = function(index) {
        if (index >= 0 && index < 64) {
            return keystr[index];
        }
        return undefined;
    };

    let output = "";

    for (let i = 0; i < data.byteLength; i += 3) {

        const groupsOfSix = [undefined, undefined, undefined, undefined];

        groupsOfSix[0] = data[i] >> 2;
        groupsOfSix[1] = (data[i] & 0x03) << 4;

        if (data.byteLength > i + 1) {
            groupsOfSix[1] |= data[i + 1] >> 4;
            groupsOfSix[2] = (data[i + 1] & 0x0f) << 2;
        }

        if (data.byteLength > i + 2) {
            groupsOfSix[2] |= data[i + 2] >> 6;
            groupsOfSix[3] = data[i + 2] & 0x3f;
        }

        for (let j = 0; j < groupsOfSix.length; j++) {
            if (typeof groupsOfSix[j] === "undefined") {
                output += "=";
            } else {
                output += btoaLookup(groupsOfSix[j]);
            }
        }
    }

    return output;
}

function Base64DecodeFile(data) {

    const regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

    if (!regex.test(data)) {
        throw new Error("String does not appear to be base64 data");
    }

    if (data.length % 4 === 0) {
        data = data.replace(/==?$/, "");
    }

    const keystr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
    const atobLookup = function(chr) {
        const index = keystr.indexOf(chr);
        return index < 0 ? undefined : index;
    };

    const output = [];

    let buffer = 0;
    let accumulatedBits = 0;

    for (let i = 0; i < data.length; i++) {
        buffer <<= 6;
        buffer |= atobLookup(data[i]);
        accumulatedBits += 6;

        if (accumulatedBits === 24) {
            output.push((buffer & 0xff0000) >> 16);
            output.push((buffer & 0xff00) >> 8);
            output.push(buffer & 0xff);
            buffer = accumulatedBits = 0;
        }
    }

    if (accumulatedBits === 12) {
        buffer >>= 4;
        output.push(buffer);
    } else if (accumulatedBits === 18) {
        buffer >>= 2;
        output.push((buffer & 0xff00) >> 8);
        output.push(buffer & 0xff);
    }

    return new Uint8Array(output).buffer;
}
