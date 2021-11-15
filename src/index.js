import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import './css/index.scss';
// import classnames from 'classnames';

let audioCtx;
let initialized = false;

const HTMLMediaRecorder = (props) => {
	
	const config = {
		countdownTimerDefault: 5
	}
	
	const parentContainer = useRef(null);
	const visualizerCanvas = useRef(null);
	const mobileCaptureInput = useRef(null);
	const [downloadReady, setDownloadReady] = useState(false);
	const [recordedBlob, setRecordedBlob] = useState(null);
	const [mediaRecorder, setMediaRecorder] = useState(null);
	const [mediaRecorderActive, setMediaRecorderActive] = useState(false);
	const [showCountdown, setCountdownVisibility] = useState(false);
	let [countdownTimer, setCountdownTimer] = useState(config.countdownTimerDefault);
	
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
			if ("srcObject" in video) {
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
			
			mediaRecorderInstance.onstop = (event) => {
				let recordedBlobInstance = new Blob(chunks, { 'type' : 'video/webm;' });
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
			visualizerCanvasEl.width = parentContainerEl.offsetWidth;
		}
		window.onresize();
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
	
	const grabMobileFile = (event, element) => {
		console.log('event', event, 'element', element);
		
		let input = event.target;
		
		console.dir(input.files[0]);
		// 	if (input.files[0].type.indexOf("audio/") > -1) {
		// 		let audio = document.getElementById('audio');
		// 		audio.src = window.URL.createObjectURL(input.files[0]);
		// 	}
		// 	else if (input.files[0].type.indexOf("video/") > -1) {
		// 		let video = document.getElementById('video');
		// 		video.src=window.URL.createObjectURL(input.files[0]);
		// 	}
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
			initializeMediaRecorder()
			initialized = true;
		}
	}
	useEffect(mounted);
	
	return (
		<div className="media-recorder" ref={parentContainer}>
			<h2>Media Recorder API Example</h2>
			
			<p>Welcome to the Media Recorder&trade;, where all of your wildest media recording dreams will come true.</p>
			
			<div className="recording-controls">
				<button id="startRecord" onClick={executeCountdown} className={`${mediaRecorderActive ? "active" : ""}`}>START RECORDING</button>
				<button id="stopRecord" onClick={stopRecord}>STOP RECORDING</button>
				<button onClick={downloadVideo} id="downloadRecording" className={`${downloadReady ? "" : "inactive"}`}>DOWNLOAD VIDEO</button>
			</div>
			
			<div className="visualizer-container">
				<canvas ref={visualizerCanvas} className="visualizer" height="60px"></canvas>
			</div>
			
			<div className="video-feed-container">
				<div>
					<h3>Input</h3>
					<div className="video-container">
						<video id="cameraFeed" className="input" muted></video>
						
						{(countdownTimer >= 1 && showCountdown) &&
							<div className="countdown">{countdownTimer}</div>
						}
					</div>
				</div>
				<div>
					<h3>Output</h3>
					<div className="video-container">
						<video id="cameraOutput" className="output" controls></video>
					</div>
				</div>
			</div>
			
			<h2>Mobile in progress</h2>
			
			<form action="#">
				
				<input ref={mobileCaptureInput} onChange={grabMobileFile} type="file" id="capture" accept="video/*,audio/*" capture multiple />
				
				<br/>
				<input type="submit" value="Process" />
			</form>
			<div><audio src="" id="audio" controls></audio></div>
			<div><video src="" id="video" controls></video></div>
		</div>
	);
}

ReactDOM.render(
	<HTMLMediaRecorder />,
	document.getElementById('root')
);
export default HTMLMediaRecorder;