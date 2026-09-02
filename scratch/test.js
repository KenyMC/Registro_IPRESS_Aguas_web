async function testFetch() {
  const url = 'https://drive.google.com/file/d/1OumsYqxIY6_A2hzehswl2oX94pY-aXuV/view'; 
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  try {
    const res = await fetch(proxyUrl);
    const text = await res.text();
    console.log('html length:', text.length);
    if (text.includes('data:image')) {
      console.log('FOUND DATA IMAGE IN HTML!');
    }
  } catch (e) {
    console.log('proxy err:', e);
  }
}
testFetch();
