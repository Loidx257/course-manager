const fs = require("node:fs");
const path = require("node:path");
const sharp = require("sharp");

const [, , inputPath, outputDirectory = "assets"] = process.argv;

if (!inputPath) {
  console.error("Usage: node scripts/create-icon.js <input-image> [output-directory]");
  process.exit(1);
}

const sizes = [16, 32, 48, 64, 128, 256];

async function main() {
  const resolvedInput = path.resolve(inputPath);
  const resolvedOutput = path.resolve(outputDirectory);

  if (!fs.existsSync(resolvedInput)) {
    throw new Error(`Input image not found: ${resolvedInput}`);
  }

  fs.mkdirSync(resolvedOutput, { recursive: true });

  const masterPath = path.join(resolvedOutput, "course-manager-icon.png");
  const iconPath = path.join(resolvedOutput, "course-manager.ico");

  await sharp(resolvedInput)
    .resize(1024, 1024, { fit: "cover", position: "centre" })
    .png({ compressionLevel: 9 })
    .toFile(masterPath);

  const images = await Promise.all(
    sizes.map((size) =>
      sharp(masterPath)
        .resize(size, size, { fit: "cover", kernel: sharp.kernel.lanczos3 })
        .png({ compressionLevel: 9 })
        .toBuffer(),
    ),
  );

  const headerSize = 6 + sizes.length * 16;
  const header = Buffer.alloc(headerSize);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(sizes.length, 4);

  let imageOffset = headerSize;
  images.forEach((image, index) => {
    const size = sizes[index];
    const entryOffset = 6 + index * 16;

    header.writeUInt8(size === 256 ? 0 : size, entryOffset);
    header.writeUInt8(size === 256 ? 0 : size, entryOffset + 1);
    header.writeUInt8(0, entryOffset + 2);
    header.writeUInt8(0, entryOffset + 3);
    header.writeUInt16LE(1, entryOffset + 4);
    header.writeUInt16LE(32, entryOffset + 6);
    header.writeUInt32LE(image.length, entryOffset + 8);
    header.writeUInt32LE(imageOffset, entryOffset + 12);
    imageOffset += image.length;
  });

  fs.writeFileSync(iconPath, Buffer.concat([header, ...images]));

  console.log(`PNG: ${masterPath}`);
  console.log(`ICO: ${iconPath}`);
  console.log(`Sizes: ${sizes.join(", ")}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
