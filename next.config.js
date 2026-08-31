/** @type {import('next').NextConfig} */
const nextConfig = {
  // react-leaflet v4's MapContainer throws "Map container is already
  // initialized" under StrictMode's double-mount in dev.
  reactStrictMode: false,
  // Don't write AGENTS.md/CLAUDE.md into the repo on every `next dev`.
  agentRules: false,
};

module.exports = nextConfig;
