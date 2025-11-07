


export function createPageUrl(pageName: string) {
    // Split the pageName to preserve query parameters
    const [path, queryString] = pageName.split('?');
    const normalizedPath = '/' + path.toLowerCase().replace(/ /g, '-');
    
    // Preserve query parameters with original case (important for IDs)
    return queryString ? `${normalizedPath}?${queryString}` : normalizedPath;
}