import { useEffect, useState } from 'react';
import { Button, List, Divider, Avatar } from 'antd';
import { HeartOutlined } from '@ant-design/icons';

const App = () => {
  const [data, setData] = useState({
    link: "",
    title: "",
    userName: "",
    likeNumber: "",
    image: "",
    likeState: "",
    userList: []
  });

  const adjectives = [
    "幸せ", "勇敢", "寡黙", "賢い", "素早い", "激しい", "優しい",
    "好奇心旺盛", "賢い", "ずる賢い", "力強い", "高貴な", "魅力的な",
    "輝く", "大胆", "大胆", "幸運", "素早い", "活気のある", "熱心",
    "創造的", "ダイナミック", "忠実", "遊び心のある", "エネルギッシュ",
    "恐れ知らず", "野心的", "機知に富んだ", "発明家", "聡明", "大胆",
    "狡猾", "優雅", "輝かしい", "機知に富んだ", "発明家", "陽気な",
    "熱心", "穏やか", "穏やか"];

  const nouns = [
    "猫", "犬", "探検家", "戦士", "空", "山", "川", "フェニックス",
    "虎", "葉", "星", "放浪者", "騎士", "影", "魔法使い", "ドラゴン",
    "森", "海", "夢想家", "船乗り", "騎士", "鷹", "クジラ", "ハヤブサ",
    "虎", "幽霊", "パスファインダー", "吟遊詩人", "遊牧民", "守護者",
    "英雄", "渦", "エコー", "ハンター", "探検家", "スフィンクス",
    "ゴーレム", "魔術師", "カラス", "人魚"];

  const maxNumber = 999;
  const usernameSet = new Set();

  const getRandomElement = (array) => {
    return array[Math.floor(Math.random() * array.length)];
  }

  const generateUsername = () => {
    const adj = getRandomElement(adjectives);
    const noun = getRandomElement(nouns);
    const num = Math.floor(Math.random() * maxNumber) + 1;
    return `${adj}${noun}${num}`;
  }

  const generateUniqueUsernames = (count) => {
    while (usernameSet.size < count) {
      const username = generateUsername();
      usernameSet.add(username);
    }
    return Array.from(usernameSet);
  }

  const getStoredArray = async () => {
    const result = await chrome.storage.local.get('data');
    return result.data || [];
  };

  const storeArray = async (array) => {
    await chrome.storage.local.set({ data: array });
  };

  const updateOrInsertData = async (newData) => {
    const storedArray = await getStoredArray();
    
    const existingIndex = storedArray.findIndex(item => item.link === newData.link);

    if (existingIndex !== -1) {
      const storedItem = storedArray[existingIndex];
      if (storedItem.likeState === true && newData.likeState === true) {
        storedItem.userList[storedItem.userList.length - 1] = newData.userName;
      }
      if (storedItem.likeState === true && newData.likeState === false) {
        storedItem.userList.pop();
      }
      if (storedItem.likeState === false && newData.likeState === true) {
        storedItem.userList.push(newData.userName);
      }

      const likeDiff = Math.abs(storedItem.userList.length - Number(newData.likeNumber));
      for (let i = 0; i < likeDiff; i++) {
        if (storedItem.likeNumber > newData.likeNumber) {
          storedItem.userList.shift();
        } else {
          storedItem.userList.unshift(newData.userList[i] || "");
        }
      }
      storedItem.userName = newData.userName;
      storedItem.likeState = newData.likeState;
      storedItem.likeNumber = newData.likeNumber;

      storedArray[existingIndex] = storedItem;
    } else {
      const newItem = { ...newData, userList: [newData.userName] };
      storedArray.push(newItem);
    }
    await storeArray(storedArray);
  };

  const getScrappingData = async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const [injectionResult] = await chrome.scripting.executeScript({
      target: { tabId: tabs[0]?.id },
      func: (url) => {
        const getNodeText = (xpath) => {
          const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          return result.singleNodeValue?.textContent?.trim() || null;
        };

        const getNodeSrc = (xpath) => {
          const result = document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null);
          return result.singleNodeValue?.src?.trim() || null;
        };

        const temp = {
          link: url,
          title: getNodeText("/html/body/div/div[1]/div[2]/main/article/div[2]/section[1]/div[1]/div[1]/div/h1"),
          userName: getNodeText("/html/body/div/div[1]/header/div/div/div[4]/nav/div/div[1]/div[1]/div/div/div/div/button/div/p"),
          likeNumber: getNodeText("/html/body/div/div[1]/div[2]/main/article/div[2]/section[1]/section[2]/div/div/div[1]/div/div[1]/button/span"),
          image: getNodeSrc("/html/body/div/div[1]/div[2]/main/article/div[1]/section/div[2]/div/div[2]/div/div[1]/div[2]/div/div[1]/div/div/div/div/figure/div[2]/picture/img"),
        };

        const likeStateXpath = "/html/body/div/div[1]/div[2]/main/article/div[2]/section[1]/section[2]/div/div/div[1]/div/div[1]/button/div/div";
        const likeStateNode = document.evaluate(likeStateXpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        const svgElement = likeStateNode?.querySelector('svg');
        temp.likeState = svgElement?.getAttribute('class')?.includes("attention") || false;

        return temp;
      },
      args: [tabs[0]?.url],
    });

    return injectionResult.result;
  };

  useEffect(() => {
    (async () => {
      const result = await getScrappingData();
      if (result.likeState) {
        const uniqueUsernames = generateUniqueUsernames(Number(result.likeNumber) - 1);
        uniqueUsernames.push(result.userName)
        result['userList'] = uniqueUsernames;
      } else {
        const uniqueUsernames = generateUniqueUsernames(Number(result.likeNumber));
        result['userList'] = uniqueUsernames;
      }
      await updateOrInsertData(result);
      const storedArray = await getStoredArray();
      console.log("dis", storedArray);
      const existingIndex = storedArray.findIndex(item => item.link === result.link);
      setData(storedArray[existingIndex]);
    })();
  }, []);

  return (
    <div className="flex flex-col items-center flex-wrap w-96 h-[390px] bg-teal-500 p-5 ">
      <div className="text-blue-500 text-[12px]">
        <span>WebSite: {data.link}</span>
      </div>
      <div className='flex items-center justify-between gap-2 pt-2'>
        {data.image && (
          <img src={data.image} alt="Scraped Image" className='w-20' />
        )}
        <div>
          <div className='flex flex-row flex-wrap w-60 text-[14px] long-text'>{data.title}</div>
          <Button type='primary' className='w-full'>
            <HeartOutlined className={data.likeState ? 'text-red-500' : ''} /> {data.likeNumber}
          </Button>
        </div>
      </div>
      <Divider />
      <div className='w-full h-40 overflow-y-scroll'>
        <List
          itemLayout="horizontal"
          dataSource={data.userList}
          renderItem={(item, index) => (
            <List.Item>
              <List.Item.Meta
                avatar={<Avatar src={`https://api.dicebear.com/7.x/miniavs/svg?seed=${index}`} />}
                title={<a href="https://ant.design">{item}</a>}
              />
            </List.Item>
          )}
        />
      </div>
    </div>
  );
}

export default App;
