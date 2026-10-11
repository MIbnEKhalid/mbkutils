/**
 * MBKUtils — Express-Handlebars View Engine Setup
 */

import path from "node:path";
import fs from "node:fs";
import { create, engine } from "express-handlebars";
import { mbkutilsViewsDir } from "./paths.js";
import { commonHandlebarsHelpers } from "./helpers/handlebarsHelpers.js";

function registerPartialsFromDirs(handlebarsInstance, dirs) {
  if (!handlebarsInstance || typeof handlebarsInstance.registerPartial !== "function") return;
  for (const dir of dirs) {
    if (!fs.existsSync(dir)) continue;
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith(".hbs")) {
          const name = entry.name.replace(/\.hbs$/, "");
          const content = fs.readFileSync(path.join(dir, entry.name), "utf-8");
          handlebarsInstance.registerPartial(name, content);
        }
      }
    } catch {
      // Continue if any directory reading fails
    }
  }
}

/**
 * Configures express-handlebars across the application, merging common helpers,
 * shared partials (including mbkutils and optionally mbkauthe views), and view directories.
 * @param {import("express").Application | import("express").Application[]} [app]
 * @param {Record<string, any>} [options]
 */
export function setupViewEngine(app, options = {}) {
  const rootDir = options.rootDir || process.cwd();
  const viewsDir = options.viewsDir || path.join(rootDir, "views");
  const extname = options.extname || ".hbs";
  const ext = extname.startsWith(".") ? extname : `.${extname}`;
  const engineExt = ext.replace(/^\./, "");
  const defaultLayout = options.defaultLayout !== undefined ? options.defaultLayout : "main";
  const layoutsDir = options.layoutsDir || path.join(viewsDir, "layouts");
  const isProduction =
    options.cache !== undefined
      ? options.cache
      : process.env.NODE_ENV === "production" || process.env.localenv === "production";

  // Discover mbkauthe views if enabled and present
  const authViewsDir = path.join(rootDir, "node_modules/mbkauthe/views");
  const hasAuthViews =
    options.includeAuthViews !== false && fs.existsSync(authViewsDir);

  // Construct Views directories
  const rawViewsDirs = [
    viewsDir,
    ...(hasAuthViews ? [authViewsDir] : []),
    mbkutilsViewsDir,
    ...(options.additionalViewsDirs || []),
  ];
  const viewsDirs = Array.from(new Set(rawViewsDirs.filter((d) => fs.existsSync(d))));

  // Construct Partials directories
  const rawPartialsDirs = [
    path.join(viewsDir, "templates"),
    path.join(viewsDir, "templates/notice"),
    path.join(viewsDir, "notice"),
    path.join(viewsDir, "partials"),
    viewsDir,
    ...(hasAuthViews ? [authViewsDir] : []),
    mbkutilsViewsDir,
    ...(options.additionalPartialsDirs || []),
  ];
  const partialsDirs = Array.from(new Set(rawPartialsDirs.filter((d) => fs.existsSync(d))));

  // Merge helpers
  const mergedHelpers = {
    ...commonHandlebarsHelpers,
    ...(options.helpers || {}),
  };

  const hbs = create({
    extname: ext,
    defaultLayout,
    layoutsDir,
    partialsDir: partialsDirs,
    helpers: mergedHelpers,
    runtimeOptions: options.runtimeOptions || {
      allowProtoPropertiesByDefault: true,
      allowProtoMethodsByDefault: true,
    },
  });

  // Pre-register partials into the Handlebars instance
  registerPartialsFromDirs(hbs.handlebars, partialsDirs);

  const hbsEngine = engine({
    extname: ext,
    defaultLayout,
    layoutsDir,
    partialsDir: partialsDirs,
    helpers: mergedHelpers,
    runtimeOptions: options.runtimeOptions || {
      allowProtoPropertiesByDefault: true,
      allowProtoMethodsByDefault: true,
    },
  });

  const configureApp = (targetApp) => {
    if (!targetApp || typeof targetApp.engine !== "function") return;
    targetApp.engine(engineExt, hbsEngine);
    targetApp.set("view engine", engineExt);
    targetApp.set("views", viewsDirs);
    targetApp.set("view cache", isProduction);
  };

  if (app) {
    if (Array.isArray(app)) {
      app.forEach(configureApp);
    } else {
      configureApp(app);
    }
  }

  return {
    engine: hbsEngine,
    hbs,
    handlebars: hbs.handlebars,
    helpers: mergedHelpers,
    viewsDirs,
    partialsDirs,
  };
}

export default setupViewEngine;
