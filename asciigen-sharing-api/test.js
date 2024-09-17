import { file } from 'bun';

const API_URL = 'http://localhost:80'; // Change to https and 443 if using HTTPS

//TO USE - UNCOMMET LINE 197 - Content-Disposition - in index. - enables content-dispostion data
//UNCOMMET LINE 45 - return true; - disables turnstile
//UNCOMMET LINE 98 - return true; - disables ratelimit
//ENABLE CORS.

async function testNewImage() {
  console.log('Testing /new endpoint...');

  const imageFile = file('dingboard.png'); // Prepare a test image in your project directory
  console.log(imageFile);
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('options', JSON.stringify({ width: 800, height: 600 }));
  formData.append('turnstile', 'test-turnstile-response');

  const response = await fetch(`${API_URL}/new`, {
    method: 'POST',
    body: formData,
  });

  if (response.ok) {
    const data = await response.json();
    console.log('New image uploaded. Share link:', data.shareLink);
    return data.shareLink;
  } else {
    console.error('Failed to upload new image:', await response.text());
  }
}

async function testExistingImage(shareLink) {
  console.log('Testing /existing endpoint...');

  const formData = new FormData();
  formData.append('shareKey', shareLink);
  formData.append('turnstile', 'test-turnstile-response');

  const response = await fetch(`${API_URL}/existing`, {
    method: 'POST',
    body: formData,
  });

  if (response.ok) {
    const contentType = response.headers.get('Content-Type');
    const contentDisposition = response.headers.get('Content-Disposition');
    const filename = contentDisposition ? contentDisposition.split('filename="')[1].split('"')[0] : 'unknown';

    console.log('Image retrieved successfully.');
    console.log('Content-Type:', contentType);
    console.log('Filename:', filename);

    const arrayBuffer = await response.arrayBuffer();
    console.log('Image size:', arrayBuffer.byteLength, 'bytes');

    // Save the retrieved image
    const outputFilename = `retrieved_${filename}`;
    await Bun.write(outputFilename, arrayBuffer);
    console.log('Image saved as:', outputFilename);

    // If you want to display image info, you can use a library like sharp
    // This part is optional and requires additional setup
    // try {
    //   const sharp = await import('sharp');
    //   const metadata = await sharp(Buffer.from(arrayBuffer)).metadata();
    //   console.log('Image metadata:', metadata);
    // } catch (error) {
    //   console.log('Sharp library not available. Skipping metadata extraction.');
    // }
  } else {
    console.error('Failed to retrieve existing image:', await response.text());
  }
}

async function runTests() {
  const shareLink = await testNewImage();
  if (shareLink) {
    await testExistingImage(shareLink);
  }
}

runTests().catch(console.error);