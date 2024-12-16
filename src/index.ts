import type { NextConfig } from "next";

import { NextCDNPlugin } from "./plugin.js";
import GoogleStorageProvider, {
  GoogleProviderConfig,
} from "./providers/google.js";

export default function withCDN(
  cdnConfig: GoogleProviderConfig
): (definedConfig: NextConfig) => NextConfig {
  return (definedConfig) => ({
    ...definedConfig,

    // Note assetPrefix is only used in production since it's not needed in development
    // and it's overwriten.
    assetPrefix: `${cdnConfig.domain}/${cdnConfig?.prefix}`,
    webpack: (config, context) => {
      config.plugins.push(
        new NextCDNPlugin({
          dev: context?.dev,
          storage: new GoogleStorageProvider(cdnConfig),
          prefix: cdnConfig?.prefix,
        })
      );
      return definedConfig?.webpack?.(config, context) ?? config;
    },
  });
}
