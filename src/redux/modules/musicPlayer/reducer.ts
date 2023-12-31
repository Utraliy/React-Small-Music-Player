import { message } from 'antd';
interface songStructure {
  [propName: string]: any;
}

interface singleSongStructure {
  id: number;
  isNull: boolean;
  name: string;
  author: string;
  avatar: string;
  img: string;
  url: string;
  invalid: boolean;
  lyric: string;
}

let audioObj = new Audio('');
audioObj.volume = 0.3;
audioObj.crossOrigin = 'anonymous';

let initAudio: songStructure = {
  isPlay: false,
  isMuted: false,
  isLoading: false,
  volume: 0.3,
  totalTime: 0,
  currentTime: 0,
  currentPrecent: 0,
  currentSong: null,
  currentSongIndex: 0,
  playQueue: [],
  /**
   * 0 持续播放
   * 1 单曲循环
   * 2 全部循环
   * 3 随机播放
   */
  playMode: 0,
  audioEle: audioObj,
  canPlay: false,
  showLyrics: false,
  // 右侧播放器是否展示
  rightStateShow: false,
};

import {
  PLAY,
  PAUSE,
  SWITCHPLAYSTATE,
  CHANGEVOLUME,
  SWITCHPLAYMODE,
  NEXTSONG,
  PREVSONG,
  REMOVEFROMQUEUE,
  CLEARQUEUE,
  CHANGEALLQUEUE,
  CHANGECURRENTTIME,
  SETCURRENTTIME,
  CHANGEBG,
  SUCCESSTOLOADSONG,
  FAILTOLOADSONG,
  SHOWLYRICS,
  MUTEPLAYER,
  SETLYRIC,
  SWITCHPLAYSTATEDISPLAY,
} from '@/redux/constant';

/**
 * 额外扩展
 */
import additionReducer from './additionReducer';
import store from '@/redux/index';
import { random, throttle } from 'lodash';
import { changeSong } from './actions';
import simplifySongListResult from '@/utils/SongList/simplifySongList';

// 播放器专用方法
/**
 * 设置播放器目前播放歌曲
 * @param data 传入歌曲数据
 */
const setAudioSource = (data: {
  id: number | string;
  url: string;
  img?: string;
}) => {
  initAudio.currentSong = data;
  audioObj.src = data.url;
  // 修改背景
  // store.dispatch({
  //   type: CHANGEBG,
  //   data: data.img ? data.img : initAudio.currentSong.img,
  // });
};

/**
 * 纯切换播放状态，不改变 redux 中的显示
 * @param data 传入 boolean 代表是否播放，不传入则自行切换
 */

const changePlayerState = async (data?: boolean) => {
  let choose = null;
  if (typeof data != 'undefined') choose = data;
  else choose = !initAudio.isPlay;

  try {
    choose ? await audioObj.play() : audioObj.pause();
  } catch (err) {
    console.log(err);
    message.error('工口发生，可能是网络问题');
    choose = false;
  } finally {
  }
};

/**
 * 监听播放结束触发 PlayEnd 事件
 */

audioObj.addEventListener('ended', (e) => {
  switch (initAudio.playMode) {
    case 0:
      if (initAudio.currentSongIndex < initAudio.playQueue.length - 1)
        store.dispatch({ type: NEXTSONG });
      else {
        // initAudio.currentSongIndex = -1;
        store.dispatch({ type: SWITCHPLAYSTATE, data: false });
      }
      break;
    case 1:
      store.dispatch({ type: PLAY });
      break;
    case 2:
      store.dispatch({ type: NEXTSONG });
      break;
    case 3:
      let info = null;
      if (initAudio.playQueue.length == 1) info = { ...initAudio.playQueue[0] };
      else {
        while (!info || info.id == initAudio.currentSong.id)
          info = {
            ...initAudio.playQueue[random(0, initAudio.playQueue.length - 1)],
          };
      }
      forceDispatchChangeMusic(info.id);
      break;

    default:
      store.dispatch({ type: NEXTSONG });
      break;
  }
});

/**
 * 监听播放器 开始暂停 事件，修复通过耳机控制播放器播放时状态未改变的情况
 */
audioObj.addEventListener('play', (e) => {
  store.dispatch({ type: SWITCHPLAYSTATEDISPLAY, data: true });
});
audioObj.addEventListener('pause', (e) => {
  store.dispatch({ type: SWITCHPLAYSTATEDISPLAY, data: false });
});

/**
 * 纯播放器控制模块，直接发起请求
 * @param play 控制是否进行播放
 * @param songInfo 指定播放歌曲的信息
 * @param callback 回调函数
 * @returns
 */
const changePlayState = async (
  play: boolean = false,
  songInfo?: singleSongStructure | undefined,
  callback?: Function,
) => {
  try {
    if (songInfo) {
      audioObj.currentTime = 0;
      audioObj.pause();
      audioObj.src = songInfo.url;
    }

    if (play) {
      initAudio.canPlay = false;
      await audioObj.play();
      initAudio.canPlay = true;

      // 修改背景
      store.dispatch({
        type: CHANGEBG,
        data: songInfo ? songInfo.img : initAudio.currentSong.img,
      });
      store.dispatch({ type: SUCCESSTOLOADSONG });
      callback && callback();
      return Promise.resolve();
    } else audioObj.pause();
  } catch (error) {
    store.dispatch({ type: FAILTOLOADSONG });
    return Promise.reject(error).catch((err) => {
      message.error('工口发生，请检查网络是否存在问题');
    });
  }
  callback && callback();
};

/**
 * 强制触发 action 中的 changeSong 事件，发送网络请求更换歌曲
 * @param id 要切换歌曲的id
 */
function forceDispatchChangeMusic(id: number | null) {
  changeSong(id)();
}

// 开启时间轴变化监听
audioObj.addEventListener(
  'timeupdate',
  throttle((e) => {
    store.dispatch({
      type: CHANGECURRENTTIME,
      data: [audioObj.currentTime, audioObj.duration],
    });
  }, 500),
);

export default function AudioReducer(
  prevState = initAudio,
  action: { [propName: string]: any },
) {
  const { type, data } = action;

  let newState = { ...initAudio };

  /**
   * 修改当前播放歌曲信息，不包括修改播放器源
   * @param index 将 CurrentSong 修改为队列的第几首歌
   */
  const changeSong = (index: number | undefined) => {
    if (
      typeof index === 'number' &&
      index >= 0 &&
      index <= newState.playQueue.length - 1
    )
      newState.currentSongIndex = index;
    else {
      newState.currentSongIndex = -1;
      newState.currentSong = null;
      return;
    }
  };

  switch (type) {
    case PLAY:
      newState.isLoading = true;
      /**
       * 如果有传入指定歌曲数据
       */
      if (data && data.handleInfo && data.SongDetailsInfo) {
        let songIndex = -1;
        newState.playQueue.forEach((val: singleSongStructure, i: number) => {
          if (val.id == data.handleInfo.id) songIndex = i;
        });
        if (songIndex == -1)
          newState.playQueue.push({ ...data.SongDetailsInfo });

        newState.currentSong = { ...data.handleInfo };

        songIndex != -1
          ? changeSong(songIndex)
          : changeSong(newState.playQueue.length - 1);

        setAudioSource(data.handleInfo);
        changePlayerState(true);
      } else if (newState.currentSong) {
        changePlayerState(true);
      }
      break;
    case SUCCESSTOLOADSONG:
      newState.isLoading = false;
      newState.isPlay = true;
      newState.canPlay = true;
      newState.currentSong['invalid'] = false;
      break;

    case FAILTOLOADSONG:
      newState.isLoading = false;
      newState.isPlay = false;
      newState.canPlay = false;
      newState.currentSong['invalid'] = true;
      newState.playQueue.map((val: singleSongStructure, i: number) => {
        if (newState.currentSong.id == val.id) val['invalid'] = true;
        return { ...val };
      });
      break;

    case PAUSE:
      audioObj.pause();
      newState.isPlay = false;
      break;

    // 仅改变音频播放状态，不改变显示控制
    case SWITCHPLAYSTATE:
      if (newState.currentSong) {
        if (typeof data != 'undefined') newState.isPlay = data;
        else newState.isPlay = !newState.isPlay;
        changePlayerState(data);
      }
      break;

    // 仅改变显示状态，不改变真实音频实例控制
    case SWITCHPLAYSTATEDISPLAY:
      newState.isPlay = data;
      break;

    case CHANGEVOLUME:
      audioObj.muted = false;
      newState.isMuted = false;
      newState.volume = data;
      audioObj.volume = data;
      break;

    case SWITCHPLAYMODE:
      newState.playMode = data;
      break;

    case NEXTSONG:
      if (newState.playQueue.length && newState.currentSong) {
        // 随机
        if (newState.playMode == 3) {
          forceDispatchChangeMusic(
            newState.playQueue[random(0, newState.playQueue.length - 1)].id,
          );
        }

        let changeSongIndex = 0;

        for (let i = 0; i < newState.playQueue.length; i++) {
          const val = newState.playQueue[i];
          if (val.id == newState.currentSong.id) {
            changeSongIndex = i;
            break;
          }
        }

        // 队尾
        if (changeSongIndex == newState.playQueue.length - 1)
          changeSongIndex = 0;
        else changeSongIndex++;

        forceDispatchChangeMusic(newState.playQueue[changeSongIndex].id);
      }
      break;

    case PREVSONG:
      if (newState.playQueue.length && newState.currentSong) {
        // 随机模式
        if (newState.playMode == 3 || data) {
          let info = null;
          if (newState.playQueue.length == 1)
            info = { ...newState.playQueue[0] };
          else {
            while (!info || info.id == newState.currentSong.id)
              info = {
                ...newState.playQueue[random(0, newState.playQueue.length - 1)],
              };
          }
          forceDispatchChangeMusic(info.id);
          break;
        }

        let changeSongIndex = 0;

        for (let i = 0; i < newState.playQueue.length; i++) {
          const val = newState.playQueue[i];
          if (val.id == newState.currentSong.id) {
            changeSongIndex = i;
            break;
          }
        }

        // 队尾
        if (changeSongIndex == 0)
          changeSongIndex = newState.playQueue.length - 1;
        else changeSongIndex--;

        forceDispatchChangeMusic(newState.playQueue[changeSongIndex].id);
      }

      break;

    /**
     * 播放结束
     */
    case 'PlayEnd':
      newState.isPlay = false;
      let couldPlay = true;
      switch (newState.playMode) {
        case 0:
          if (newState.currentSongIndex == newState.playQueue.length - 1)
            couldPlay = false;
          else changeSong(newState.currentSongIndex + 1);
          break;
        case 1:
          break;
        case 2:
          changeSong(
            newState.currentSongIndex < newState.playQueue.length - 1
              ? newState.currentSongIndex + 1
              : 0,
          );

        case 3:
          changeSong(random(0, newState.playQueue.length - 1, false));
          break;
        default:
          break;
      }

      if (couldPlay) {
        changePlayState(true);
        newState.isPlay = true;
      }
      break;

    /**
     * 删除指定歌曲
     */
    case REMOVEFROMQUEUE:
      if (!newState.playQueue.length) break;
      /**
       * 当前正在播放的歌曲
       */
      let temp = -1;
      newState.playQueue.forEach((val: singleSongStructure, i: number) => {
        if (val.id == data) temp = i;
      });
      if (data === newState.currentSong.id) {
        // 长度不为1
        if (newState.playQueue.length != 1) {
          if (temp == -1) break;
          const nextSongInfo =
            temp == newState.playQueue.length - 1
              ? { ...newState.playQueue[0] }
              : { ...newState.playQueue[temp + 1] };
          const nextSongIndex =
            temp == newState.playQueue.length - 1 ? 0 : temp + 1;
          newState.currentSong = nextSongInfo;
          newState.currentSongIndex = nextSongIndex;
          forceDispatchChangeMusic(nextSongInfo.id);
        }
        // 清空队列
        else {
          newState.currentSong = null;
          newState.playQueue = [];
          changePlayState(false);
          audioObj.src = '';
          newState.canPlay = false;
          newState.isPlay = false;
          break;
        }
      }
      if (temp != -1) newState.playQueue.splice(temp, 1);
      break;

    /**
     * 清空播放队列
     */
    case CLEARQUEUE:
      audioObj.src = '';
      newState.playQueue = [];
      newState.currentSong = null;
      break;

    /**
     * 更新当前时间轴
     */
    case CHANGECURRENTTIME:
      const [cur, total] = data;
      newState.currentTime = cur;
      newState.totalTime = total;
      newState.currentPrecent = (cur / total).toFixed(2);
      break;

    /**
     * 设置当前播放位置
     */
    case SETCURRENTTIME:
      audioObj.currentTime = data;
      break;
    /**
     * 替换整个播放列表
     */
    case CHANGEALLQUEUE:
      /**
       * 全新播放列表
       */
      if (action.newList) {
        if (!data || data.length == 0) {
          newState.playQueue = [];
          newState.currentSong = null;
          changePlayState(false);
          break;
        }
        const filterList = ['id', 'name', 'ar'];
        newState.playQueue = data.map((val: any) =>
          simplifySongListResult(val, filterList),
        );
      } else if (typeof action.newList != 'undefined') {
        /**
         * 调整了播放顺序，没更新列表
         */
        newState.playQueue = [...data];
        let newIndex = -1;
        data.forEach((val: any, i: number) => {
          if (val.id == newState.currentSong?.id) {
            newIndex = i;
          }
        });
        newState.currentSongIndex = newIndex;
      }
      break;
    case SHOWLYRICS:
      typeof data != 'undefined'
        ? (newState.showLyrics = data)
        : (newState.showLyrics = !newState.showLyrics);
      break;
    case MUTEPLAYER:
      typeof data != 'undefined'
        ? (newState.isMuted = data)
        : (newState.isMuted = !newState.isMuted);
      audioObj.muted = newState.isMuted;
      break;

    /**
     * -1 获取中
     * 0 无歌词信息
     * 1 纯音乐
     * 其他为正常歌词
     */
    case SETLYRIC:
      const { lyric, id } = data;
      let i = -1;
      newState.playQueue.forEach((val: singleSongStructure, index: number) => {
        if (val.id == id) i = index;
      });
      if (i == -1) break;

      if (lyric == 0) newState.playQueue[i].lyricContent = 0;
      else if (lyric == 1) newState.playQueue[i].lyricContent = 1;
      else {
        newState.playQueue[i].lyricContent = lyric;
        newState.playQueue[i].lyricContent = lyric;
      }

      break;
    default:
      let trigger = false;
      /**
       * 额外添加事件
       */
      for (const i in additionReducer) {
        if (type == i) {
          trigger = true;
          additionReducer[i](newState, changeSong, changePlayState);
        }
      }
      if (trigger) break;
      break;
  }
  newState.playQueue = [...newState.playQueue];
  initAudio = JSON.parse(JSON.stringify(newState));
  initAudio.audioEle = audioObj;

  return newState;
}
