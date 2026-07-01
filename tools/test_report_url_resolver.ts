import { findImageUrlInHtml } from '../mobile/services/reportUrlUtils';

const html = `
<!DOCTYPE html>
<html>
<body>
  <img src="/logo.png" />
  <img src="http://119.23.70.228/report/abc123/report.jpg" id="report" />
</body>
</html>
`;

const url = findImageUrlInHtml(html, 'http://119.23.70.228/report/view?id=1');
if (url !== 'http://119.23.70.228/report/abc123/report.jpg') {
  throw new Error(`Expected report image URL, got: ${url}`);
}

const relativeHtml = `<img src="./images/result.png" />`;
const relativeUrl = findImageUrlInHtml(relativeHtml, 'http://119.23.70.228/show');
if (relativeUrl !== 'http://119.23.70.228/images/result.png') {
  throw new Error(`Expected relative URL resolution, got: ${relativeUrl}`);
}

console.log('PASS: report URL resolver');
