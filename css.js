var fs = require('jsdoc/fs');
var path = require('jsdoc/path');


var defaultCSSProps = {
    // Font applied to headings.
    headingFont: 'heading',
    // Font applied to body/normal texts.
    bodyFont: 'body',
    // Font applied to code.
    codeFont: 'code',
    // The background color of selected text on the dark theme.
    darkSelectionBg: '#ffce76',
    // The text color of selected text on the dark theme.
    darkSelectionTextColor: '#222',
    // The background color of the body on the dark theme.
    darkBodyBg: '#1a1a1a',
    // Disabled item color on the dark theme.
    darkDisabledColor: '#aaa',
    // The text color on the dark theme.
    darkBodyTextColor: '#fff',
    // Anchor's color on the dark theme.
    darkAnchorColor: '#00bbff',
    // Horizontal line color on the dark theme.
    darkHrColor: '#222',
    // Heading color on the dark theme.
    darkHeadingColor: '#fff',
    // Sidebar background color on the dark theme.
    darkSidebarBg: '#222',
    // Sidebar text color on the dark theme.
    darkSidebarTextColor: '#999',
    // Sidebar title's color on the dark theme.
    darkSidebarTitleColor: '#999',
    // Sidebar accordion title color on the dark theme.
    darkSidebarAccordionTitleColor: '#999',
    // Sidebar accordion title hover background color on the dark theme.
    darkSidebarAccordionTitleHoverBg: '#252525',
    // Sidebar accordion arrow color on the dark theme.
    darkSidebarAccordionArrowColor: '#999',
    // Sidebar accordion child background on the dark theme.
    darkSidebarAccordionChildBg: '#292929',
    // Sidebar accordion child item color on the dark theme.
    darkSidebarAccordionChildItemColor: '#fff',
    // Sidebar accordion child item hover background on the dark theme.
    darkSidebarAccordionChildItemHoverBg: '#2c2c2c',
    // Navbar background on the dark theme. Make sure it matches with the
    // background color of the body, otherwise it will look a bit odd.
    darkNavbarBg: '#1a1a1a',
    // Icon button color on the dark theme.
    darkIconButtonFillColor: '#999',
    // Navbar item text color on the dark theme.
    darkNavbarItemColor: '#999',
    // Color of the icon on the  for font size on the dark theme.
    darkFontSizeTooltipIconColor: '#fff',
    // Disabled color of the icon on the tooltip for font size on the dark theme.
    darkFontSizeTooltipIconColorWhenDisabled: '#999',
    // Icon button background when hovered on the dark theme.
    darkIconButtonHoverBg: '#333',
    // Icon button background when click is active on the dark theme.
    darkIconButtonActiveBg: '#444',
    // Navbar item color when active on the dark theme.
    darkNavbarItemActiveColor: '#aaa',
    // Navbar item background when active on the dark theme.
    darkNavbarItemActiveBg: '#222',
    // Navbar item hover background on the dark theme.
    darkNavbarItemHoverBg: '#202020',
    // Footer background on the dark theme.
    darkFooterColor: '#222',
    // Footer text color on the dark theme.
    darkFooterTextColor: '#999',
    // Footer on the dark theme.
    darkFooterLinkColor: '#999',
    // Toc link color on the dark theme.
    darkTocLinkColor: '#777',
    // Toc active link color on the dark theme.
    darkTocActiveLinkColor: '#fff',
    // Heading anchor color on the dark theme.
    darkHeadingAnchorColor: '#555',
    // Heading anchor hover color on the dark theme.
    darkHeadingAnchorHoverColor: '#888',
    // Inline code background on the dark theme.
    darkInlineCodeBg: '#333',
    // Inline code text color on the dark theme.
    darkInlineCodeTextColor: '#fff',
    // Signature attributes color on the dark theme.
    darkSignatureAttributesColor: '#aaa',
    // Ancestors on the dark theme.
    darkAncestorsColor: '#999',
    // Ancestors link color on the dark theme.
    darkAncestorsLinkColor: '#999',
    // Deprecated text color on the dark theme.
    darkDeprecatedColor: '#c51313',
    // Type signature text color on the dark theme.
    darkTypeSignatureColor: '#00918e',
    // Member name text color on the dark theme.
    darkMemberNameColor: '#f7f7f7',
    // Details container background on the dark theme.
    darkDetailsBg: '#222',
    // Details container text color on the dark theme.
    darkDetailsTextColor: '#fff',
    // Code top bar container background on the dark theme.
    darkCodeTopBarBg: '#292929',
    // Source code background on the dark theme.
    darkSourceCodeBg: '#222',
    // Source code text color on the dark theme.
    darkSourceCodeTextColor: '#c9d1d9',
    // Code line numbers color on the dark theme.
    darkCodeLineNumbersColor: '#777',
    // Code language text color on the dark theme.
    darkCodeLangColor: '#ff8a00',
    // Code copied tooltip background on the dark theme.
    darkCodeTooltipBg: '#ffce76',
    // Code copied tooltip text color on the dark theme.
    darkCodeTooltipColor: '#222',
    // Code comment text color on the dark theme.
    darkCodeCommentColor: '#8b949e',
    // Code keyword text color on the dark theme.
    darkCodeKeywordColor: '#ff7b72',
    // Code type text color on the dark theme.
    darkCodeTypeColor: '#30ac7c',
    // Code string text color on the dark theme.
    darkCodeStringColor: '#a5d6ff',
    // Code class text color on the dark theme.
    darkCodeClassColor: '#ffa657',
    // Code function text color on the dark theme.
    darkCodeFunctionColor: '#d2a8ff',
    // Code variable text color on the dark theme.
    darkCodeVariableColor: '#79c0ff',
    // Code symbol text color on the dark theme.
    darkCodeSymbolColor: '#ffa657',
    // Code selector text color on the dark theme.
    darkCodeSelectorColor: '#7ee787',
    // Code subst text color on the dark theme.
    darkCodeSubstColor: '#c9d1d9',
    // Code Section text color on the dark theme.
    darkCodeSectionColor: '#1f6feb',
    // Code bullet text color on the dark theme.
    darkCodeBulletColor: '#f2cc60',
    // Code emphasis text color on the dark theme.
    darkCodeEmphasisColor: '#c9d1d9',
    // Code strong text color on the dark theme.
    darkCodeStrongColor: '#c9d1d9',
    // Code copied  text color on the dark theme.
    darkCodeColor: '#222',
    // Selected code line background on the dark theme.
    darkSelectedCodeLineBg: '#444',
    // Selected code line number color on the dark theme.
    darkSelectedLineNumberColor: '#eee',
    // Table td background on the dark theme.
    darkTableTdBg: '#292929',
    // Table th background on the dark theme.
    darkTableThBg: '#222',
    // Table Th text color on the dark theme.
    darkTableThColor: '#fff',
    // Table Tr background on the dark theme.
    darkTableTrBg: '#222',
    // Table Tr text color on the dark theme.
    darkTableTrColor: '#fff',

}

/**
 * 
 * @param {typeof defaultCSSProps} cssProps 
 * @returns {string} :root css rule.
 */
function mapCSSPropsToCSSVar(cssProps) {
    return ""
}

module.exports = function (outdir) {
    fs.writeFileSync(path.join(outdir, 'new.css'), ":root{ --test-color: #007bff; }")

}