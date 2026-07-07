import {
  buildBodbodyShareImageCandidates,
  buildImageCandidateUrls,
  expandBodbodyPageUrls,
  extractImageReferenceFromJson,
  extractMuscleFatFromJson,
  findImageUrlInHtml,
  isBodbodyShareUrl,
  isSpaShell,
  parseReportPageUrl,
} from '../mobile/services/reportUrlUtils';

const html = `
<!DOCTYPE html>
<html>
<body>
  <div id="app"></div>
  <script type="module" src="/assets/index.js"></script>
</body>
</html>
`;

if (!isSpaShell(html)) throw new Error('SPA shell not detected');

const url = findImageUrlInHtml(
  `<img src="http://119.23.70.228/report/abc123/report.jpg" id="report" />`,
  'http://119.23.70.228/report/view?id=1'
);
if (url !== 'http://119.23.70.228/report/abc123/report.jpg') {
  throw new Error(`Expected report image URL, got: ${url}`);
}

const ctx = parseReportPageUrl('http://119.23.70.228:80/#/report?reportId=abc123&token=xyz');
if (ctx.params.reportId !== 'abc123') throw new Error('reportId not parsed from hash');

const candidates = buildImageCandidateUrls('http://119.23.70.228/report/show?reportId=test99');
if (!candidates.some((c) => c.includes('test99') && c.includes('8080'))) {
  throw new Error('Expected 8080 candidate with reportId');
}
if (!candidates.some((c) => c.includes('/report/image?reportId=test99'))) {
  throw new Error('Expected /report/image candidate');
}

const jsonRef = extractImageReferenceFromJson(
  JSON.stringify({ data: { reportImage: 'http://119.23.70.228:8080/report/x.jpg' } }),
  'http://119.23.70.228/'
);
if (jsonRef !== 'http://119.23.70.228:8080/report/x.jpg') {
  throw new Error(`JSON extract failed: ${jsonRef}`);
}

const bodbodyUrl =
  'http://bodbody.com.cn/share/index.html?id=164&time=20260623134603&sn=ABC123';
if (!isBodbodyShareUrl(bodbodyUrl)) throw new Error('Bodbody share URL not detected');

const expanded = expandBodbodyPageUrls(bodbodyUrl);
if (!expanded.some((u) => u.includes('119.23.70.228') && u.includes('id=164'))) {
  throw new Error('Expected Bodbody IP fallback in expanded page URLs');
}
if (expanded.length > 6) throw new Error('Expected at most 6 expanded Bodbody page URLs');

const bodbodyCandidates = buildBodbodyShareImageCandidates(bodbodyUrl);
if (!bodbodyCandidates.some((c) => c.includes('/share/report.jpg?id=164'))) {
  throw new Error('Expected Bodbody /share/report.jpg candidate');
}
if (!bodbodyCandidates.some((c) => c.includes('119.23.70.228'))) {
  throw new Error('Expected Bodbody IP candidate');
}

const metrics = extractMuscleFatFromJson(
  JSON.stringify({
    code: 0,
    data: { weight: 61.2, skeletalMuscle: 24.5, bodyFat: 22.0 },
  })
);
if (metrics?.weight !== 61.2 || metrics?.skeletalMuscle !== 24.5 || metrics?.bodyFat !== 22.0) {
  throw new Error(`JSON metrics extract failed: ${JSON.stringify(metrics)}`);
}

console.log('PASS: report URL resolver tests');
