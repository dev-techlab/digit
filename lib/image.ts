export function getLocalImageUrl(url: string | null | undefined): string {
  if (!url) return '';

  try {
    let pathname = url;

    // If it's an absolute URL (like the old digitlink.mobi domain), extract just the path
    if (url.startsWith('http')) {
      pathname = new URL(url).pathname;
    }

    // Ensure it's absolute from the domain root
    if (!pathname.startsWith('/')) {
      pathname = '/' + pathname;
    }

    // Map old /providers/ paths to the new local /img/p/ folder where images were downloaded
    if (pathname.startsWith('/providers/')) {
      pathname = pathname.replace('/providers/', '/img/p/');
    }

    return pathname;
  } catch (e) {
    // If URL parsing fails for any reason, return the original string
    return url;
  }
}
