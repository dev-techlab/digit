export function getLocalImageUrl(url: string | null | undefined): string {
  if (!url) return '';

  try {
    let pathname = url;

    // If it's an absolute URL, extract just the path
    if (url.startsWith('http')) {
      pathname = new URL(url).pathname;
    }

    // Ensure it's absolute from the domain root
    if (!pathname.startsWith('/')) {
      pathname = '/' + pathname;
    }

    // Return the dynamic URL from the live server
    return `https://octanlink.com${pathname}`;
  } catch (e) {
    // If URL parsing fails for any reason, return the original string
    return url;
  }
}
