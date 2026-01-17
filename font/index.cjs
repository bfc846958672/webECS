const { spawn } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");

// /e:/game/font-gen/index.js
// 执行：./lib/msdf-atlas-gen.exe -font "C:/Windows/Fonts/simhei.ttf" -charset ./src/charset.txt -type msdf -size 64 -pxrange 8 -imageout output/atlas.png -json output/atlas.json


const exePath = path.resolve(__dirname, "lib", "msdf-atlas-gen.exe");
const fontPath = "C:/Windows/Fonts/simhei.ttf";
const charsetPath = path.resolve(__dirname, "src", "charset.txt");

const outDir = path.resolve(__dirname, "output");
console.log("输出目录：", outDir);
fs.mkdirSync(outDir, { recursive: true });

const args = [
    "-font",
    fontPath,
    "-charset",
    charsetPath,
    "-type",
    "msdf",
    "-size",
    "64",
    "-pxrange",
    "8",
    "-imageout",
    path.join(outDir, "atlas.png"),
    "-json",
    path.join(outDir, "atlas.json"),
];

const child = spawn(exePath, args, {
    stdio: "inherit",
    windowsHide: true,
});

child.on("error", (err) => {
    console.error("启动失败：", err);
    process.exit(1);
});

child.on("close", (code) => {
    process.exit(code ?? 1);
});