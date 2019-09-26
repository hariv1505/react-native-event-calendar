// @flow
import {
  View,
  Text,
  RefreshControl,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import populateEvents from './Packer';
import React from 'react';
import moment from 'moment';
import _ from 'lodash';

const LEFT_MARGIN = 60 - 1;
// const RIGHT_MARGIN = 10
const CALENDER_HEIGHT = 2400;
// const EVENT_TITLE_HEIGHT = 15
const TEXT_LINE_HEIGHT = 17;
// const MIN_EVENT_TITLE_WIDTH = 20
// const EVENT_PADDING_LEFT = 4

function range(from, to) {
  return Array.from(Array(to), (_, i) => from + i);
}

export default class DayView extends React.Component {
  constructor(props) {
    super(props);
    this.calendarHeight = (props.end - props.start) * 100;
    this.dayStart = props.start;
    this.dayEnd = props.end;
    const width = props.width - LEFT_MARGIN;
    const packedEvents = populateEvents(props.events, width, props.start);
    this.state = {
      _scrollY: this.getInitPosToScrollTo(
        packedEvents,
        this.calendarHeight,
        props.start,
        props.end
      ),
      packedEvents,
    };
  }

  shouldComponentUpdate(nextProps, nextState) {
    return (
      JSON.stringify(this.props) !== JSON.stringify(nextProps) ||
      JSON.stringify(this.state) !== JSON.stringify(nextState)
    );
  }

  componentWillReceiveProps(nextProps) {
    if (JSON.stringify(this.props) !== JSON.stringify(nextProps)) {
      const width = nextProps.width - LEFT_MARGIN;
      let packedEvents = populateEvents(
        nextProps.events,
        width,
        nextProps.start
      );
      this.setState({
        _scrollY: this.getInitPosToScrollTo(
          packedEvents,
          this.calendarHeight,
          nextProps.start,
          nextProps.end
        ),
        packedEvents,
      });
      const scrollToEvent = packedEvents.filter(
        event => event.scrollTo == true
      )[0];
      if (scrollToEvent) {
        this.scrollToEvent(scrollToEvent);
      } else if (this.props.events.length == 0 && nextProps.events.length > 0) {
        this.scrollToFirst();
      }
    }
  }

  componentDidMount() {
    this.props.scrollToFirst && this.scrollToFirst();
  }

  getInitPosToScrollTo(packedEvents, calendarHeight, start, end) {
    let initPosition =
      _.min(_.map(packedEvents, 'top')) - calendarHeight / (end - start);
    initPosition = initPosition < 0 ? 0 : initPosition;
    return initPosition;
  }

  scrollToFirst() {
    setTimeout(() => {
      if (this.state && this.state._scrollY && this._scrollView) {
        this._scrollView.scrollTo({
          x: 0,
          y: this.state._scrollY,
          animated: true,
        });
      }
    }, 1);
  }

  scrollToEvent(event) {
    let scrollPosition =
      event.top - this.calendarHeight / (this.dayEnd - this.dayStart);
    this._scrollView.scrollTo({
      x: 0,
      y: scrollPosition,
      animated: true,
    });
    event.scrollTo = false;
  }

  _renderRedLine() {
    const offset = 100;
    const { format24h } = this.props;
    const { width, styles } = this.props;
    const timeNowHour = moment().hour();
    const timeNowMin = moment().minutes();
    return (
      <View
        key={`timeNow`}
        style={[
          styles.lineNow,
          {
            top:
              offset * (timeNowHour - this.props.start) +
              (offset * timeNowMin) / 60,
            width: width - 20,
          },
        ]}
      />
    );
  }

  _renderLines() {
    const { format24h, start, end } = this.props;
    const offset = this.calendarHeight / (end - start);

    return range(start, end + 1).map((i, index) => {
      let timeText;
      if (i === start) {
        timeText = ``;
      } else if (i < 12) {
        timeText = !format24h ? `${i} AM` : i;
      } else if (i === 12) {
        timeText = !format24h ? `${i} PM` : i;
      } else if (i === 24) {
        timeText = !format24h ? `12 AM` : 0;
      } else {
        timeText = !format24h ? `${i - 12} PM` : i;
      }
      const { width, styles } = this.props;
      return [
        <Text
          key={`timeLabel${i}`}
          style={[styles.timeLabel, { top: offset * index - 6 }]}
        >
          {timeText}
        </Text>,
        i === start ? null : (
          <View
            key={`line${i}`}
            style={[styles.line, { top: offset * index, width: width - 20 }]}
          />
        ),
        <View
          key={`lineHalf${i}`}
          style={[
            styles.line,
            { top: offset * (index + 0.5), width: width - 20 },
          ]}
        />,
      ];
    });
  }

  _renderTimeLabels() {
    const { styles, start, end } = this.props;
    const offset = this.calendarHeight / (end - start);
    return range(start, end).map((item, i) => {
      return (
        <View key={`line${i}`} style={[styles.line, { top: offset * i }]} />
      );
    });
  }

  _onEventTapped(event) {
    this.props.eventTapped(event);
  }

  _renderEvents() {
    const { styles } = this.props;
    const { packedEvents } = this.state;
    let events = packedEvents.map((event, i) => {
      const style = {
        left: event.left,
        height: event.height,
        width: event.width,
        top: event.top,
      };

      const eventColor = {
        backgroundColor: event.color,
      };

      // Fixing the number of lines for the event title makes this calculation easier.
      // However it would make sense to overflow the title to a new line if needed
      const numberOfLines = Math.floor(event.height / TEXT_LINE_HEIGHT);
      const formatTime = this.props.format24h ? 'HH:mm' : 'hh:mm A';
      return (
        <TouchableOpacity
          activeOpacity={0.5}
          onPress={() => this._onEventTapped(this.props.events[event.index])}
          key={i}
          style={[styles.event, style, event.color && eventColor]}
        >
          {this.props.renderEvent ? (
            this.props.renderEvent(event)
          ) : (
            <View>
              <Text numberOfLines={1} style={styles.eventTitle}>
                {event.title || 'Event'}
              </Text>
              {numberOfLines > 1 ? (
                <Text
                  numberOfLines={numberOfLines - 1}
                  style={[styles.eventSummary]}
                >
                  {event.summary || ' '}
                </Text>
              ) : null}
              {numberOfLines > 2 ? (
                <Text style={styles.eventTimes} numberOfLines={1}>
                  {moment(event.start).format(formatTime)} -{' '}
                  {moment(event.end).format(formatTime)}
                </Text>
              ) : null}
            </View>
          )}
        </TouchableOpacity>
      );
    });

    return (
      <View>
        <View style={{ marginLeft: LEFT_MARGIN }}>{events}</View>
      </View>
    );
  }

  _outsideClickHandler() {
    if (this.props.outsideClickHandler) {
      this.props.outsideClickHandler();
    }
  }

  _onRefreshHandler() {
    if (this.props.onRefreshHandler) {
      this.props.onRefreshHandler();
    }
  }

  render() {
    const { styles } = this.props;
    return (
      <ScrollView
        ref={ref => (this._scrollView = ref)}
        contentContainerStyle={[
          styles.contentStyle,
          { width: this.props.width },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={this.props.dragDownRefreshing}
            onRefresh={() => this._onRefreshHandler()}
          />
        }
      >
        {this._renderLines()}
        {this._renderEvents()}
        {this._renderRedLine()}

        {this.props.outsideClickHandler ? (
          <TouchableOpacity
            onPress={() => this._outsideClickHandler()}
            style={{
              zIndex: -99,
              height: this.calendarHeight,
              top: 0,
            }}
          />
        ) : null}
      </ScrollView>
    );
  }
}
