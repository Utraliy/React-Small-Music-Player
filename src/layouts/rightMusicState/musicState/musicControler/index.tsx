import React, { createRef, Fragment, RefObject } from 'react';
import './index.scss';
import TransparentButton from '@/components/transparentButton';
import RightMusicVolumeControler from './volume';

import {
  switchPlayState,
  prevSong,
  nextSong,
  changeVolume,
  showLyrics,
  mutePlayer,
} from '@/redux/modules/musicPlayer/actions';
import { connect } from 'react-redux';

interface MusicControlerProps {
  name: string;
  isPlay: boolean;
  lyricsState: boolean;
  isMuted: boolean;
  showLyrics: Function;
  prevSong: Function;
  nextSong: Function;
  switchPlayState: Function;
  mutePlayer: Function;
}

interface MusicControlerState {}

class MusicControler extends React.Component<
  MusicControlerProps,
  MusicControlerState
> {
  volEle: RefObject<HTMLDivElement> = createRef();

  render() {
    return (
      <Fragment>
        <p className="song_name">
          {this.props.name ? this.props.name : '_(:з」∠)_'}
        </p>
        <div className="music_controler">
          <TransparentButton closeHoverPointer={true}>
            <div
              className="right_music_volume_container"
              ref={this.volEle}
              onMouseLeave={() => this.switchVolumeSlider(false)}
            >
              <RightMusicVolumeControler />
              <div onMouseEnter={() => this.switchVolumeSlider(true)}>
                {this.props.isMuted ? (
                  <i
                    className="iconfont icon-24gl-volumeZero"
                    onClick={() => this.props.mutePlayer()}
                  ></i>
                ) : (
                  <i
                    className="iconfont icon-24gl-volumeMiddle"
                    onClick={() => this.props.mutePlayer()}
                  ></i>
                )}
              </div>
            </div>
          </TransparentButton>
          <TransparentButton>
            <i
              className="iconfont icon-24gl-previous"
              onClick={() => this.props.prevSong()}
            ></i>
          </TransparentButton>
          <TransparentButton>
            <div onClick={() => this.props.switchPlayState()}>
              {this.props.isPlay ? (
                <i className="iconfont icon-24gl-pause"></i>
              ) : (
                <i className="iconfont icon-24gl-play"></i>
              )}
            </div>
          </TransparentButton>
          <TransparentButton>
            <i
              className="iconfont icon-24gl-next"
              onClick={() => this.props.nextSong()}
            ></i>
          </TransparentButton>
          <TransparentButton>
            <div
              className="iconfont"
              onClick={() => this.props.showLyrics(!this.props.lyricsState)}
            >
              词
            </div>
          </TransparentButton>
        </div>
      </Fragment>
    );
  }

  switchVolumeSlider = (mark: boolean) => {
    const ele = this.volEle.current;
    mark
      ? ele?.setAttribute('class', 'right_music_volume_container active')
      : ele?.setAttribute('class', 'right_music_volume_container');
  };
}

export default connect(
  (state: { [propName: string]: any }) => ({
    isPlay: state.MusicPlayer.isPlay,
    name: state.MusicPlayer.currentSong?.name,
    lyricsState: state.MusicPlayer.showLyrics,
    isMuted: state.MusicPlayer.isMuted,
  }),
  {
    switchPlayState,
    prevSong,
    nextSong,
    changeVolume,
    showLyrics,
    mutePlayer,
  },
)(MusicControler);
