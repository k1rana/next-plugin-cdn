import { PassThrough, Writable } from "stream";
import { type Compiler } from "webpack";
import { StorageProvider } from "./providers/interface.js";

class DummyStorageProvider implements StorageProvider {
  // This is a dummy provider. It does nothing.
  // You can use this as a template to create your own provider.
  write(file: string) {
    console.error("Method not implemented. This is a dummy provider.");
    return new Writable();
  }
  async has(file: string): Promise<boolean> {
    return true;
  }
}

interface Config {
  dev?: boolean;
  storage?: StorageProvider;
  prefix?: string;
}

export class NextCDNPlugin {
  config: Required<Config>;

  constructor(options?: Config) {
    this.config = {
      dev: false,
      storage: new DummyStorageProvider(), // default provider. should never be used
      prefix: "",
      ...options,
    };
  }

  apply(compiler: Compiler) {
    if (this.config.dev) {
      return;
    }

    const { storage } = this.config;

    compiler.hooks.assetEmitted.tapPromise(
      "NextCDNPlugin",
      (file: string, { content }: any) => {
        return new Promise((resolve, reject) => {
          if (/static/g.test(file)) {
            // This is a hack to fix the path of the file.
            const regex = /^(?:\.\.\/\.\.\/|\.\.\/\.\.|\/|\.\.\/)/;
            if (regex.test(file)) {
              file = file.replace(regex, "");
            }
            file = `${file}`;

            const prefix = `${
              this.config.prefix && `${this.config.prefix}/`
            }_next/`;

            storage.has(`${prefix}${file}`).then((exists) => {
              if (exists) {
                // file already exits in storage. skip upload
                // in future, we can check if the file has changed and re-upload
                // or we can force re-upload by deleting the file first
                console.log(`\x1b[35mcdn\x1b[0m  - Re-upload ${file}`);

                // resolve();
                // // console.warn(`\x1b[35mcdn\x1b[0m  - Skipped uploading ${file}`);
                // return;
              }

              const fileRef = storage.write(`${prefix}${file}`);

              const passthroughStream = new PassThrough();
              passthroughStream.write(content);
              passthroughStream.end();

              passthroughStream
                .pipe(fileRef)
                .on("finish", () => {
                  console.info(
                    `\x1b[35mcdn\x1b[0m   - Uploaded ${prefix}${file}`
                  );
                  resolve();
                })
                .on("error", (err) => {
                  console.error(
                    `\x1b[35mcdn\x1b[0m   - Failed to uploaded ${prefix}${file}`
                  );
                  reject(err);
                });
            });
          }

          resolve();
        });
      }
    );
  }
}
