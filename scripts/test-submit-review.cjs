/**
 * 口コミ投稿APIのテストスクリプト
 */

async function testSubmitReview() {
  console.log('🧪 口コミ投稿APIテスト\n');

  const testData = {
    site_id: 'rec0IwB47l9yAIrGT', // オールウイン
    user_name: 'テストユーザー',
    user_email: 'test@example.com',
    rating: 4,
    title: 'テスト投稿',
    content: 'これはテスト投稿です。実際の口コミではありません。削除してください。',
  };

  try {
    console.log('📤 送信データ:');
    console.log(JSON.stringify(testData, null, 2));
    console.log();

    const response = await fetch('https://frabjous-taiyaki-460401.netlify.app/.netlify/functions/submit-review', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testData),
    });

    console.log(`📊 ステータスコード: ${response.status}`);
    console.log(`📊 ステータステキスト: ${response.statusText}`);
    console.log();

    const responseText = await response.text();
    console.log('📥 レスポンス（生データ）:');
    console.log(responseText);
    console.log();

    if (responseText) {
      try {
        const data = JSON.parse(responseText);
        console.log('📥 レスポンス（JSON）:');
        console.log(JSON.stringify(data, null, 2));

        if (data.success) {
          console.log('\n✅ 口コミ投稿成功！');
        } else {
          console.log('\n❌ 口コミ投稿失敗');
          console.log('エラー:', data.error);
          if (data.details) {
            console.log('詳細:', data.details);
          }
        }
      } catch (parseError) {
        console.log('\n⚠️  JSON パースエラー');
        console.log('エラー:', parseError.message);
      }
    } else {
      console.log('\n⚠️  空のレスポンス');
    }

  } catch (error) {
    console.error('\n❌ リクエストエラー:');
    console.error(error);
  }
}

testSubmitReview();
