import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import axios from 'axios';
import './css/index.scss';
import renameIcon from './assets/svg/rename.svg';
import deleteIcon from './assets/svg/delete.svg';
import downloadIcon from './assets/svg/download.svg';

let audioCtx;
let initialized = false;

let recordedBlobInstance;

let startTime;
let elapsedTime = 0;
let timerInterval;

const HTMLMediaRecorder = (props) => {
	
	const config = {
		countdownTimerDefault: 3
	}
	
	const parentContainer = useRef(null);
	const visualizerCanvas = useRef(null);
	const [downloadReady, setDownloadReady] = useState(false);
	const [recordedBlob, setRecordedBlob] = useState(null);
	const [mediaRecorder, setMediaRecorder] = useState(null);
	const [mediaRecorderActive, setMediaRecorderActive] = useState(false);
	const [showCountdown, setCountdownVisibility] = useState(false);
	let [countdownTimer, setCountdownTimer] = useState(config.countdownTimerDefault);
	const [recordingTimestamp, setRecordingTimestamp] = useState(Date.now());
	
	const [recordingStartTime, setRecordingStartTime] = useState(0);
	const [recordingElapsedTime, setRecordingElapsedTime] = useState(0);
	const [recordingTimeInterval, setRecordingTimeInterval] = useState(null);
	const [emptyMessagesActive, setEmptyMessageActive] = useState(true);
	
	const initializeMediaRecorder = () => {
		
		let constraints = { 
			audio: true,
			// video: true // default options
			video: {
				width: {
					min: 640,
					ideal: 1280,
					max: 1920
				},
				height: {
					min: 303.15,
					ideal: 720,
					max: 1080
				}
			}
		};
		
		checkOldBrowsers();
		
		navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
			
			let video = document.querySelector('#cameraFeed');
			if ('srcObject' in video) {
				video.srcObject = stream;
			}
			else {
				video.src = window.URL.createObjectURL(stream); // old version
			}
			
			video.onloadedmetadata = (event) => {
				video.play(); 	// show in the video element what is being captured by the webcam
			};
			
			let vidSave = document.getElementById('cameraOutput');
			let options = {mimeType: 'video/webm; codecs=vp9'};
			let mediaRecorderInstance = new MediaRecorder(stream, options);
			
			visualize(stream);
			
			let chunks = [];
			mediaRecorderInstance.ondataavailable = function(event) {
				chunks.push(event.data);
			}
			
			mediaRecorderInstance.onstart = (event) => {
				setMediaRecorderActive(true);
			}
			
			mediaRecorderInstance.onstop = async (event) => {
				recordedBlobInstance = new Blob(chunks, { 'type' : 'video/webm;' });
				chunks = [];
				let videoURL = window.URL.createObjectURL(recordedBlobInstance);
				vidSave.src = videoURL;
				
				setDownloadReady(true);
				setRecordedBlob(recordedBlobInstance);
				setMediaRecorderActive(false);
			}
			setMediaRecorder(mediaRecorderInstance);
		})
		.catch(function(err) { 
			console.log(err.name, err.message);
		});
	};
	
	const checkOldBrowsers = () => {
		if (navigator.mediaDevices === undefined) {
			
			alert('running old browser function');
			navigator.mediaDevices = {};
			navigator.mediaDevices.getUserMedia = function(constraints) {
				let getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
				if (!getUserMedia) {
					return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
				}
				return new Promise(function(resolve, reject) {
					getUserMedia.call(navigator, constraints, resolve, reject);
				});
			}
		}
		else {
			navigator.mediaDevices.enumerateDevices().then(devices => {
				devices.forEach(device => { /* console.log(device.kind.toUpperCase(), device.label);*/ });
			}).catch(error => { console.log(error.name, error.message);});
		}
	}
	
	const visualize = (stream) => {
		
		if (!audioCtx) {
			audioCtx = new AudioContext();
		}
		let canvas = visualizerCanvas.current;
		let canvasCtx = canvas.getContext('2d');
		
		const source = audioCtx.createMediaStreamSource(stream);
		const analyser = audioCtx.createAnalyser();
		analyser.fftSize = 2048;
		const bufferLength = analyser.frequencyBinCount;
		const dataArray = new Uint8Array(bufferLength);
	
		source.connect(analyser);
	
		draw();
		function draw() {
			const WIDTH = canvas.width
			const HEIGHT = canvas.height;
			requestAnimationFrame(draw);
			analyser.getByteTimeDomainData(dataArray);
			canvasCtx.fillStyle = 'rgb(0, 0, 0)';
			canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
			canvasCtx.lineWidth = 2;
			canvasCtx.strokeStyle = 'rgb(255, 255, 255)';
			canvasCtx.beginPath();
			let sliceWidth = WIDTH * 1.0 / bufferLength;
			let x = 0;
	
			for (let i = 0; i < bufferLength; i++) {
	
				let v = dataArray[i] / 128.0;
				let y = v * HEIGHT/2;
				if (i === 0) {
					canvasCtx.moveTo(x, y);
				}
				else {
					canvasCtx.lineTo(x, y);
				}
				x += sliceWidth;
			}
			canvasCtx.lineTo(canvas.width, canvas.height/2);
			canvasCtx.stroke();
		}
		
		let parentContainerEl = parentContainer.current;
		let visualizerCanvasEl = visualizerCanvas.current
		window.onresize = function() {
			if (visualizerCanvasEl.parentElement) visualizerCanvasEl.width = visualizerCanvasEl.parentElement.offsetWidth;
		}
	}
	
	const downloadVideo = () => {
		let url = URL.createObjectURL(recordedBlob);
		let a = document.createElement('a');
		document.body.appendChild(a);
		a.style = 'display: none';
		a.href = url;
		a.download = 'videoCapture.webm';
		a.click();
		window.URL.revokeObjectURL(url);
	}
	
	const clearEmptyMessage = () => {
		
	}
	
	const grabMobileFile = (event) => {
		
		let input = event.target;
		
		if (input.files.length && input.files[0].type.indexOf('video/') > -1) {
			let video = document.getElementById('cameraOutput');
			video.classList.remove('empty');
			video.src=window.URL.createObjectURL(input.files[0]);
			setEmptyMessageActive(false);
		}
	}
	
	const beginRecord = () => {
		setCountdownVisibility(false);
		if (mediaRecorder.state !== 'recording') mediaRecorder.start();
	}
	
	const stopRecord = () => {
		if (mediaRecorder.state === 'recording') {
			mediaRecorder.stop();
			setCountdownTimer(config.countdownTimerDefault);
		}
	}
	
	const executeCountdown = () => {
		setCountdownVisibility(true);
		let countdownInterval = setInterval(() => {
			if (countdownTimer <= 1) {
				beginRecord();
				setCountdownTimer(null);
				clearInterval(countdownInterval);
			}
			countdownTimer -= 1;
			setCountdownTimer(countdownTimer);
			
		}, 1000);
	}
	
	const mounted = () => {
		if (!initialized) {
			initializeMediaRecorder();
			startTimer();
			setTimeout(() => {
				window.dispatchEvent(new Event('resize'));
			}, 1000);
			initialized = true;
		}
	}
	useEffect(mounted);
	
	const timeToString = (time) => {
		let diffInHrs = time / 3600000;
		let hh = Math.floor(diffInHrs);
	
		let diffInMin = (diffInHrs - hh) * 60;
		let mm = Math.floor(diffInMin);
	
		let diffInSec = (diffInMin - mm) * 60;
		let ss = Math.floor(diffInSec);
	
		let diffInMs = (diffInSec - ss) * 100;
		let ms = Math.floor(diffInMs);
	
		let formattedMM = mm.toString().padStart(2, '0');
		let formattedSS = ss.toString().padStart(2, '0');
		let formattedMS = ms.toString().padStart(2, '0');
	
		return `${formattedMM}:${formattedSS}:${formattedMS}`;
	}
	
	const startTimer = () => {
		
		setRecordingStartTime(Date.now() - recordingElapsedTime);
		// startTime = Date.now() - elapsedTime;
		setRecordingTimeInterval(setInterval(() => {
			// elapsedTime = Date.now() - recordingStartTime;
			setRecordingElapsedTime(Date.now() - recordingStartTime);
			// console.log(timeToString(Date.now() - recordingStartTime))
			// print(timeToString(elapsedTime));
		}, 10));
	}
	
	const pauseTimer = () => {
		clearInterval(recordingTimeInterval);
	}
	
	const resetTimer = () => {
		clearInterval(recordingTimeInterval);
		console.log('00:00:00');
		setRecordingElapsedTime(0);
	}
	return (
		<div className="media-recorder" ref={parentContainer}>
			
			<h2>Media Recorder API Example</h2>
			
			<p>Welcome to the Media Recorder&trade;, where all of your wildest media recording dreams will come true.</p>
			
			<div className="sidebar-layout">
				<div className="sidebar">
					<h3>Uploaded Videos</h3>
					<ul className="file-list">
						<li>
							Video 1
							<img src={renameIcon} alt="rename media" />
							<img src={deleteIcon} alt="delete media" />
							<img src={downloadIcon} alt="download media" />
						</li>
					</ul>
				</div>
				<div className="sidebar-main">
					
					<div className="panel">
						
						<div className="mobile-upload">
							<h2>Mobile Video Upload</h2>
							<form>
								<input type="file" onChange={grabMobileFile} type="file" id="capture" accept="video/*, audio/*" capture multiple />
							</form>
						</div>
						
						<div className="video-feed-container flex">
							<div className="camera-feed column">
								<h3>Camera Feed</h3>
								<div className="video-container">
									<video id="cameraFeed" className="input" muted></video>
									<div className="recording-overlay">
											
										{mediaRecorderActive &&
											<div className="recording-indicator">
												<svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
												<circle cx="55" cy="55" r="50" fill="#000" />
													<circle cx="50" cy="50" r="50" />
												</svg>
												{timeToString(recordingElapsedTime)}
											</div>
										}
										
										{(countdownTimer >= 1 && showCountdown) &&
											<div className="countdown">{countdownTimer}</div>
										}
									</div>
								</div>
							</div>
							<div className="column">
								<h3>Media Viewer</h3>
								<div className="video-container">
									<video id="cameraOutput" className="output empty" controls></video>
									{emptyMessagesActive &&
										<div className="empty-message">Record or upload video here to view.</div>
									}
								</div>
							</div>
						</div>
						
						<div className="visualizer-ui">
							<h3>Microphone Feed</h3>
							<div className="visualizer-container">
								<canvas ref={visualizerCanvas} className="visualizer" height="60px"></canvas>
							</div>
						</div>
						
						<div className="recording-controls">
							<button id="startRecord" onClick={executeCountdown} className={`${mediaRecorderActive ? 'active' : ''}`}>Start Recording</button>
							<button id="stopRecord" onClick={stopRecord}>Stop Recording</button>
							<button onClick={downloadVideo} id="downloadRecording" className={`${downloadReady ? '' : 'inactive'}`}>Download Video</button>
						</div>
						
					</div>
				</div>
			</div>
		</div>
	);
}

ReactDOM.render(
	<HTMLMediaRecorder />,
	document.getElementById('root')
);
export default HTMLMediaRecorder;