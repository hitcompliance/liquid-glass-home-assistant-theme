import { readFile, writeFile, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const upstream = new URL('../node_modules/@samasante/liquid-glass/dist/index.js', import.meta.url);
const generated = new URL('../frontend/.samasante-svg-build.js', import.meta.url);
const source = await readFile(upstream, 'utf8');

// Export the upstream DOM/SVG path directly. The published package's Glass
// switch also includes WebGL media paths; tree shaking this import removes them
// completely from the shipped Home Assistant resource.
const adapter = `
export const SvgGlass = ({ refract, behind, optics, width, height, radius, children, ...rest }) =>
  jsx(GlassDOM, {
    ...rest, lensW: width, lensH: height, borderRadius: radius,
    lens: optics, refractionTarget: refract, refractionBackground: behind,
    children,
  });
`;

try {
  await writeFile(generated, `${source}\n${adapter}`);
  await build({
    entryPoints: [fileURLToPath(new URL('../frontend/dash5-glass.source.jsx', import.meta.url))],
    outfile: fileURLToPath(new URL('../frontend/dash5-glass.js', import.meta.url)),
    bundle: true, minify: true, format: 'esm', target: 'es2022',
    treeShaking: true,
  });
  const bundle = await readFile(new URL('../frontend/dash5-glass.js', import.meta.url), 'utf8');
  const forbidden = ['getContext("webgl', 'WebGLRenderingContext', 'WebGL2RenderingContext',
    'createShader(', 'drawArrays(', 'experimental-webgl'];
  const present = forbidden.filter((token) => bundle.includes(token));
  if (present.length || /webgl/i.test(bundle)) throw new Error(`WebGL found in bundle: ${present.join(', ')}`);
  console.log(`SVG-only glass bundle: ${Buffer.byteLength(bundle)} bytes`);
} finally {
  await unlink(generated).catch(() => {});
}
