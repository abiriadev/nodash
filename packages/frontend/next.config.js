/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	transpilePackages: ['@nodash/backend'], // If we import types or code from backend later
}

export default nextConfig
