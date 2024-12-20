export function parseSummaryToMarkdown(summary: string, meetingType: string): string {
  // Remove HTML tags and clean up the text
  const cleanText = summary.replace(/<[^>]*>/g, '');
  
  // Split into sections based on common patterns
  const sections = cleanText.split(/\n{2,}|\. (?=[A-Z])/);
  
  // Create markdown structure
  let markdown = `# ${meetingType} Meeting Summary\n\n`;
  
  // Add main sections
  markdown += '## Key Points\n';
  sections.forEach((section) => {
    if (section.trim()) {
      // Check if the section appears to be a list item
      if (section.match(/^[•\-\*]/)) {
        markdown += section.trim() + '\n';
      } else {
        markdown += '- ' + section.trim() + '\n';
      }
    }
  });

  // Extract and add action items if present
  const actionItems = sections.filter(s => 
    s.toLowerCase().includes('action') || 
    s.toLowerCase().includes('task') ||
    s.toLowerCase().includes('todo')
  );

  if (actionItems.length > 0) {
    markdown += '\n## Action Items\n';
    actionItems.forEach(item => {
      markdown += '- ' + item.trim() + '\n';
    });
  }

  // Extract and add decisions if present
  const decisions = sections.filter(s => 
    s.toLowerCase().includes('decide') || 
    s.toLowerCase().includes('decision') ||
    s.toLowerCase().includes('agreed')
  );

  if (decisions.length > 0) {
    markdown += '\n## Decisions\n';
    decisions.forEach(decision => {
      markdown += '- ' + decision.trim() + '\n';
    });
  }

  return markdown;
}