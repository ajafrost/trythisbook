/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "covers.openlibrary.org" },
      { protocol: "https", hostname: "*.gr-assets.com" },
      { protocol: "https", hostname: "images-na.ssl-images-amazon.com" },
      { protocol: "https", hostname: "i.gr-assets.com" },
      { protocol: "https", hostname: "s.gr-assets.com" },
    ],
  },
  // Book covers are content-addressed by book id and effectively never change,
  // so let browsers/CDN cache them for a year.
  async headers() {
    return [
      {
        source: "/covers/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // "/" is dynamically rendered (force-dynamic) so the wall grid is in
        // the HTML. It's identical for everyone, so let the CDN cache it.
        source: "/",
        headers: [
          {
            key: "Cache-Control",
            value: "public, s-maxage=3600, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
