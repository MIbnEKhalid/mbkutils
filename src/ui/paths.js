import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Absolute path to the shared Handlebars views & partials in mbkutils.
 */
export const viewsDir = path.resolve(__dirname, "../../views");

/**
 * Absolute path to the shared static assets (css, js, images) in mbkutils.
 */
export const publicDir = path.resolve(__dirname, "../../public");

export const mbkutilsViewsDir = viewsDir;
export const mbkutilsPublicDir = publicDir;
