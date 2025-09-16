/**
 * Eleventy data file to fetch accessibility reports
 * Pulls report metadata from S3 for static site generation
 */

const AWS = require('aws-sdk');

module.exports = async function() {
  const s3 = new AWS.S3();
  
  try {
    // List all HTML reports in S3
    const response = await s3.listObjectsV2({
      Bucket: process.env.REPORTS_BUCKET,
      Prefix: 'reports/',
      Delimiter: '/'
    }).promise();

    const reports = [];
    
    // Group by domain
    for (const prefix of response.CommonPrefixes || []) {
      const domain = prefix.Prefix.replace('reports/', '').replace('/', '');
      
      // Get reports for this domain
      const domainReports = await s3.listObjectsV2({
        Bucket: process.env.REPORTS_BUCKET,
        Prefix: `reports/${domain}/`,
      }).promise();

      const htmlReports = domainReports.Contents
        .filter(obj => obj.Key.endsWith('.html'))
        .map(obj => ({
          domain,
          filename: obj.Key.split('/').pop(),
          size: obj.Size,
          lastModified: obj.LastModified,
          url: `https://${process.env.REPORTS_BUCKET}.s3.amazonaws.com/${obj.Key}`,
          jsonUrl: `https://${process.env.REPORTS_BUCKET}.s3.amazonaws.com/${obj.Key.replace('.html', '.json')}`
        }))
        .sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));

      if (htmlReports.length > 0) {
        reports.push({
          domain,
          reportCount: htmlReports.length,
          reports: htmlReports,
          latestReport: htmlReports[0]
        });
      }
    }

    return {
      reports: reports.sort((a, b) => 
        new Date(b.latestReport.lastModified) - new Date(a.latestReport.lastModified)
      ),
      lastUpdated: new Date().toISOString()
    };

  } catch (error) {
    console.error('Failed to fetch reports:', error);
    return {
      reports: [],
      error: error.message,
      lastUpdated: new Date().toISOString()
    };
  }
};