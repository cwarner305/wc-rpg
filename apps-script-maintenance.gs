/**
 * Optional maintenance helpers for the WC RPG Apps Script backend.
 *
 * Hook these actions into your doPost router:
 * - action: "admin_clear_students"
 * - action: "admin_consolidate_legacy_sheets"
 */

function adminClearStudents_() {
  const ss = SpreadsheetApp.getActive();
  const attempts = ss.getSheetByName('attempts');
  const summary = ss.getSheetByName('students_summary');
  const character = ss.getSheetByName('character_state');

  [attempts, summary, character].forEach(sheet => {
    if (!sheet) return;
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, sheet.getMaxColumns()).clearContent();
    }
  });

  return {
    ok: true,
    message: 'All student gameplay rows were cleared (headers preserved).'
  };
}

function adminConsolidateLegacySheets_() {
  const ss = SpreadsheetApp.getActive();

  // Keep only gameplay-critical tabs.
  const keep = new Set([
    'question_bank',
    'attempts',
    'students_summary',
    'character_state',
    'equipment_catalog'
  ]);

  ss.getSheets().forEach(sheet => {
    if (keep.has(sheet.getName())) return;

    // Instead of deleting immediately, hide and prefix to archive legacy content safely.
    const oldName = sheet.getName();
    const archivedName = oldName.startsWith('archive_') ? oldName : `archive_${oldName}`;
    try {
      sheet.setName(archivedName.substring(0, 99));
    } catch (e) {
      // ignore rename collision and continue to hide
    }
    sheet.hideSheet();
  });

  return {
    ok: true,
    message: 'Legacy sheets were archived/hidden. Review before permanent deletion.'
  };
}
