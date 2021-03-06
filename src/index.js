import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
// import axios from 'axios';
import './css/index.scss';
import renameIcon from './assets/svg/rename.svg';
import deleteIcon from './assets/svg/delete.svg';
import downloadIcon from './assets/svg/download.svg';

let initialized = false;
let audioCtx,recordedBlobInstance;
let startTime, elapsedTime = 0, timerInterval = setInterval(() => {}, 100000);
const config = {
	countdownTimerDefault: 3
}

const HTMLMediaRecorder = (props) => {
	
	const visualizerCanvas = useRef(null);
	const [downloadReady, setDownloadReady] = useState(false);
	const [recordedBlob, setRecordedBlob] = useState(null);
	const [mediaRecorder, setMediaRecorder] = useState(null);
	const [mediaRecorderActive, setMediaRecorderActive] = useState(false);
	const [showCountdown, setCountdownVisibility] = useState(false); let [countdownTimer, setCountdownTimer] = useState(config.countdownTimerDefault);
	const [recordingTimestamp, setRecordingTimestamp] = useState(0);
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
				clearInterval(timerInterval);
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
		
		if (!audioCtx) audioCtx = new AudioContext();
		let canvas = visualizerCanvas.current;
		let canvasCtx = canvas.getContext('2d');
		const source = audioCtx.createMediaStreamSource(stream);
		const analyser = audioCtx.createAnalyser();
		analyser.fftSize = 2048;
		const bufferLength = analyser.frequencyBinCount;
		const dataArray = new Uint8Array(bufferLength);
		source.connect(analyser);
	
		function draw() {
			const WIDTH = canvas.width, HEIGHT = canvas.height;
			requestAnimationFrame(draw);
			analyser.getByteTimeDomainData(dataArray);
			canvasCtx.fillStyle = 'rgb(0, 0, 0)';
			canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
			canvasCtx.lineWidth = 2;
			canvasCtx.strokeStyle = 'rgb(255, 255, 255)';
			canvasCtx.beginPath();
			let sliceWidth = WIDTH * 1.0 / bufferLength, x = 0;
			
			for (let i = 0; i < bufferLength; i++) {
				let v = dataArray[i] / 128.0, y = v * HEIGHT/2;
				if (i === 0) { canvasCtx.moveTo(x, y);}
				else { canvasCtx.lineTo(x, y); }
				x += sliceWidth;
			}
			canvasCtx.lineTo(canvas.width, canvas.height/2);
			canvasCtx.stroke();
		}
		draw();
		let visualizerCanvasEl = visualizerCanvas.current
		window.onresize = function() {
			if (visualizerCanvasEl.parentElement) visualizerCanvasEl.width = visualizerCanvasEl.parentElement.offsetWidth;
		}
	}
	
	const downloadVideo = () => {
		let url = URL.createObjectURL(recordedBlob), a = document.createElement('a');
		document.body.appendChild(a); a.style = 'display: none'; a.href = url; a.download = 'videoCapture.webm'; a.click();
		window.URL.revokeObjectURL(url);
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
	
	const beginRecording = () => {
		setCountdownVisibility(false);
		startTimer();
		if (mediaRecorder.state !== 'recording') mediaRecorder.start();
	}
	
	const stopRecording = () => {
		if (mediaRecorder.state === 'recording') {
			mediaRecorder.stop();
			setCountdownTimer(config.countdownTimerDefault);
		}
	}
	
	const executeCountdown = () => {
		setCountdownVisibility(true);
		let countdownInterval = setInterval(() => {
			if (countdownTimer <= 1) {
				beginRecording();
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
			setTimeout(() => {
				window.dispatchEvent(new Event('resize'));
			}, 1000);
			initialized = true;
		}
	}
	useEffect(mounted);
	
	const timeToString = (time) => {
		let diffInHrs = time / 3600000, hh = Math.floor(diffInHrs);
		let diffInMin = (diffInHrs - hh) * 60, mm = Math.floor(diffInMin);
		let diffInSec = (diffInMin - mm) * 60, ss = Math.floor(diffInSec);
		let diffInMs = (diffInSec - ss) * 100, ms = Math.floor(diffInMs);
		let formattedMM = mm.toString().padStart(2, '0'), formattedSS = ss.toString().padStart(2, '0'), formattedMS = ms.toString().padStart(2, '0');
		return `${formattedMM}:${formattedSS}:${formattedMS}`;
	}
	
	const startTimer = () => {
		elapsedTime = 0;
		startTime = Date.now() - elapsedTime;
		timerInterval = setInterval(function printTime() {
			elapsedTime = Date.now() - startTime;
			setRecordingTimestamp(elapsedTime);
		}, 10);
	}
	
	return (
		<div className="media-recorder">
			
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
								<input type="file" onChange={grabMobileFile} id="capture" accept="video/*, audio/*" capture multiple />
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
												{timeToString(recordingTimestamp)}
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
							{!mediaRecorderActive && 
								<button id="startRecord" onClick={executeCountdown}>Start Recording</button>
							}
							{mediaRecorderActive && 
								<button id="stopRecording" onClick={stopRecording} className={`${mediaRecorderActive ? 'active' : ''}`}>Stop Recording</button>
							}
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