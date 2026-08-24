/**
 * Tally baseline / attest for MOCK ATLAS3 LLP.
 *
 * READ-ONLY. Exports the voucher register so the run can prove, at close, that
 * Atlas never posted a voucher. Run once at the start and again at the end.
 */
import { findTallyExe, tallyIniPath, TALLY_URL, MOCK_COMPANY } from "../../tally-xml.mjs";

const company = process.env.TALLY_COMPANY || MOCK_COMPANY;
console.log("exe    :", findTallyExe() ?? "not found");
console.log("ini    :", tallyIniPath() ?? "not found");
console.log("url    :", TALLY_URL);
console.log("company:", company);

const xml = `<ENVELOPE><HEADER><VERSION>1</VERSION><TALLYREQUEST>Export</TALLYREQUEST><TYPE>Collection</TYPE><ID>Voucher Register</ID></HEADER><BODY><DESC><STATICVARIABLES><SVEXPORTFORMAT>$$SysName:XML</SVEXPORTFORMAT><SVCURRENTCOMPANY>${company}</SVCURRENTCOMPANY><SVFROMDATE>20260401</SVFROMDATE><SVTODATE>20270331</SVTODATE></STATICVARIABLES></DESC></BODY></ENVELOPE>`;

const res = await fetch(TALLY_URL, {
  method: "POST",
  headers: { "Content-Type": "text/xml;charset=utf-8" },
  body: xml,
  signal: AbortSignal.timeout(20000),
});
const text = await res.text();
const vouchers = (text.match(/<VOUCHER\b/g) || []).length;
const err = /<LINEERROR>([^<]*)</.exec(text);
console.log("\nvouchers in FY26-27:", vouchers);
if (err) console.log("tally says:", err[1]);
console.log("baseline at:", new Date().toISOString());
