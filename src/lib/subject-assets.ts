
export const getSubjectImage = (subjectName: string): string => {
    const normalize = subjectName.toLowerCase();
    if (normalize.includes('iot')) return 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80';
    if (normalize.includes('arduino')) return 'https://images.unsplash.com/photo-1555664424-778a69fdb6c8?auto=format&fit=crop&w=800&q=80';
    if (normalize.includes('roblox')) return 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?auto=format&fit=crop&w=800&q=80'; // Gaming generic
    if (normalize.includes('python')) return 'https://images.unsplash.com/photo-1526379095098-d400fd0bf935?auto=format&fit=crop&w=800&q=80';
    if (normalize.includes('scratch')) return 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80'; // Coding generic
    if (normalize.includes('microbit')) return 'https://images.unsplash.com/photo-1551033406-611cf9a28f67?auto=format&fit=crop&w=800&q=80';
    if (normalize.includes('web')) return 'https://images.unsplash.com/photo-1547658719-da2b51169166?auto=format&fit=crop&w=800&q=80';
    if (normalize.includes('data')) return 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80';
    if (normalize.includes('javascript')) return 'https://images.unsplash.com/photo-1579468118864-1b9ea3c0db4a?auto=format&fit=crop&w=800&q=80';

    // Default gradient-ish or abstract tech
    return 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=800&q=80';
};

export const getSubjectGradient = (subjectName: string): string => {
    // Fallback gradients if image fails or for overlays
    return 'from-indigo-500/80 to-purple-600/80';
};
