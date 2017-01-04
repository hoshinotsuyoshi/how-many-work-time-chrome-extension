console.log('start!');
const page = 'https://ssl.jobcan.jp/employee/attendance?code=[ここにcodeを埋める]';

//--------------------------
//所定労働日数
const standardWorkdaysCount = (doc) => {
    const result = doc.getElementById('search-result');
    const table  = result.querySelector("div.infotpl").querySelectorAll("table.left")[0];
    const td     = table.querySelectorAll("tr")[4].querySelector("td");
    return parseFloat(td.innerText.replace(' ','').replace('日', ''));
};

//所定労働時間
//所定労働日数に8を掛けたもの
const standardWorkHoursCount = (doc) => {
    return(standardWorkdaysCount(doc) * 8);
};

//勤務中かどうか
const isWorking = (doc) => {
    const text = doc.body.textContent;
    return !!text.match(/勤務中/);
}

//今までの実質労働時間
const workedHoursCount = (doc) => {
    const result    = doc.getElementById('search-result');
    const table     = result.querySelector("div.infotpl").querySelectorAll("table.left")[1];
    const td        = table.querySelectorAll("tr")[1].querySelector("td");
    const timeArray = td.innerText.split(':')
    const hour      = parseInt(timeArray[0]);
    const minute    = parseInt(timeArray[1]);
    return(hour + minute / 60.0);
};

//実労働時間に有給分の労働時間を足したもの。全休=8時間、半休=4時間
const excessWorkedHoursCount = (doc) => {
    const workedHours = workedHoursCount(doc);
    const paidHoridaysSpent1 = paidHoridaysSpentTable(doc)['有休(全休)'] || 0;
    const paidHoridaysSpent2 = paidHoridaysSpentTable(doc)['有休(AM休)'] || 0;
    const paidHoridaysSpent3 = paidHoridaysSpentTable(doc)['有休(PM休)'] || 0;
    return(workedHours + paidHoridaysSpent1*8 + paidHoridaysSpent2*8 + paidHoridaysSpent3*8);
};

//実働日数
const workdaysCount = (doc) => {
    const result    = doc.getElementById('search-result');
    const table     = result.querySelector("div.infotpl").querySelectorAll("table.right")[0];
    const td        = table.querySelectorAll("tr")[1].querySelector("td");
    return parseFloat(td.innerText);
};

//有給消化テーブル
// {
//   "有休(全休)": 2,
//   "有休(PM休)": 0.5
// }
// などの値が返る。
const paidHoridaysSpentTable = (doc) => {
    const result = doc.getElementById('search-result');
    const table  = result.querySelector("div.infotpl").querySelectorAll("table.right")[1];
    const fifth  = table.querySelectorAll("tbody")[1];
    const trs    = fifth.querySelectorAll("tr");
    const object = {}
    const merge  = (element) => {
        const key   = element.querySelector('th').innerText;
        const value = parseFloat(element.querySelector('td').innerText);
        object[key] = value;
        return null;
    }
    trs.forEach(merge);
    return(object);
}

// 今月の残り出勤可能日数
const restWorkdaysCount = (doc) => {
    const paidHoridaysSpent = paidHoridaysSpentTable(doc)['有休(全休)'] || 0;
    return(standardWorkdaysCount(doc) - workdaysCount(doc) - paidHoridaysSpent);
}

// 1日あたり何時間働けばいいか
// 所定労働時間から実質労働時間を引いた値を残りの出勤可能日数で割ったもの。
const requiredWorkHoursCount = (doc) => {
    return((standardWorkHoursCount(doc) - excessWorkedHoursCount(doc)) / restWorkdaysCount(doc));
}

//--------------------------

const parser = new DOMParser();

// https://syncer.jp/javascript-reverse-reference/processing-decimal-point
// 小数点n位までを残す関数
// number=対象の数値
// n=残したい小数点以下の桁数
const floatFormat = (number, n) => {
    const pow = Math.pow(10, n);
    return Math.round(number*pow)/pow;
}

const badgeText = (doc) => {
    return floatFormat(requiredWorkHoursCount(doc),2).toString();
}

const main = () => {
    fetch(page,{credentials:"include"})
        .then((_response) => {
            fetch(page,{credentials:"include"})
                .then((response) => {
                    return response.text();
                }).then((text) => {
                    const doc = parser.parseFromString(text, 'text/html');
                    chrome.browserAction.setBadgeText({ text: badgeText(doc) });
                })
        });
}

chrome.browserAction.onClicked.addListener((_tab) => {
    console.log('clicked');
    chrome.browserAction.setBadgeText({ text: '....'});
    main();
});
