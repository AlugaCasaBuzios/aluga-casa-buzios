import {
  copyFile,
  mkdir,
  readdir,
  rename,
  rm,
  stat,
} from "node:fs/promises";

import path from "node:path";

import sharp from "sharp";

const MAX_WIDTH = 8192;
const MAX_HEIGHT = 4096;
const JPEG_QUALITY = 82;

const projectDirectory =
  process.cwd();

const tourDirectory =
  path.join(
    projectDirectory,
    "public",
    "images",
    "tours",
    "piloto"
  );

const userDirectory =
  process.env.USERPROFILE ??
  process.env.HOME ??
  projectDirectory;

const timestamp =
  new Date()
    .toISOString()
    .replace(/[:.]/g, "-");

const backupDirectory =
  path.join(
    userDirectory,
    "Downloads",
    `backup-tour-360-${timestamp}`
  );

function formatMegabytes(
  bytes
) {
  return `${(
    bytes /
    1024 /
    1024
  ).toFixed(2)} MB`;
}

async function optimizeImage(
  fileName
) {
  const inputPath =
    path.join(
      tourDirectory,
      fileName
    );

  const backupPath =
    path.join(
      backupDirectory,
      fileName
    );

  const temporaryPath =
    `${inputPath}.optimizing`;

  const originalInformation =
    await stat(inputPath);

  const originalMetadata =
    await sharp(inputPath, {
      limitInputPixels: false,
    }).metadata();

  await copyFile(
    inputPath,
    backupPath
  );

  try {
    await sharp(inputPath, {
      limitInputPixels: false,
    })
      .rotate()
      .resize({
        width: MAX_WIDTH,
        height: MAX_HEIGHT,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({
        quality: JPEG_QUALITY,
        progressive: true,
        mozjpeg: true,
        chromaSubsampling:
          "4:2:0",
      })
      .toFile(temporaryPath);

    const optimizedMetadata =
      await sharp(
        temporaryPath
      ).metadata();

    const optimizedInformation =
      await stat(
        temporaryPath
      );

    await rm(inputPath);

    await rename(
      temporaryPath,
      inputPath
    );

    console.log(
      [
        `✓ ${fileName}`,
        `${originalMetadata.width}x${originalMetadata.height}`,
        "→",
        `${optimizedMetadata.width}x${optimizedMetadata.height}`,
        "|",
        formatMegabytes(
          originalInformation.size
        ),
        "→",
        formatMegabytes(
          optimizedInformation.size
        ),
      ].join(" ")
    );
  } catch (error) {
    await rm(
      temporaryPath,
      {
        force: true,
      }
    );

    throw error;
  }
}

async function main() {
  await mkdir(
    backupDirectory,
    {
      recursive: true,
    }
  );

  const files =
    (
      await readdir(
        tourDirectory
      )
    )
      .filter(
        (fileName) =>
          /\.(jpe?g)$/i.test(
            fileName
          )
      )
      .sort();

  if (files.length === 0) {
    console.log(
      "Nenhuma imagem JPG foi encontrada."
    );

    return;
  }

  console.log(
    `Backup das imagens originais: ${backupDirectory}`
  );

  console.log(
    `Otimizando ${files.length} imagem(ns)...`
  );

  for (const fileName of files) {
    await optimizeImage(
      fileName
    );
  }

  console.log(
    "Otimização concluída com segurança."
  );
}

main().catch((error) => {
  console.error(
    "Não foi possível otimizar as imagens:",
    error
  );

  process.exitCode = 1;
});
