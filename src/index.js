import React from 'react';
import ReactDOM from 'react-dom';
import './index.scss';

class HTMLMediaRecorder extends React.Component {
	
	constructor(props) {
		super(props);
		this.parentContainer = React.createRef();
		this.mediaRecorder = null;
		this.recordingActive = false;
		this.visualizerCanvas = React.createRef();
	}
	
	initializeMediaRecorder = () => {
		
		let constraints = { 
			audio: true,
			video: true
		};
		
		this.checkOldBrowsers();
		
		navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
			
			let video = document.querySelector('#cameraFeed');
			if ("srcObject" in video) {
				video.srcObject = stream;
			}
			else {
				video.src = window.URL.createObjectURL(stream); //old version
			}
			
			video.onloadedmetadata = (event) => {
				video.play(); 	// show in the video element what is being captured by the webcam
			};
			
			let start = document.getElementById('btnStart'); // add listeners for saving video/audio
			let stop = document.getElementById('btnStop');
			let vidSave = document.getElementById('cameraOutput');
			this.mediaRecorder = new MediaRecorder(stream);
			this.visualize(stream);
			
			let chunks = [];
			
			start.addEventListener('click', (event) => {
				this.mediaRecorder.start();
				this.recordingActive = true;
			})
			
			stop.addEventListener('click', (event) => {
				this.mediaRecorder.stop();
				this.recordingActive = false;
			});
			
			this.mediaRecorder.ondataavailable = function(event) {
				chunks.push(event.data);
			}
			
			this.mediaRecorder.onstop = (event) => {
				let blob = new Blob(chunks, { 'type' : 'video/mp4;' });
				chunks = [];
				let videoURL = window.URL.createObjectURL(blob);
				vidSave.src = videoURL;
			}
		})
		.catch(function(err) { 
			console.log(err.name, err.message); 
		});
		
		/*********************************
		getUserMedia returns a Promise
		resolve - returns a MediaStream Object
		reject returns one of the following errors
		AbortError - generic unknown cause
		NotAllowedError (SecurityError) - user rejected permissions
		NotFoundError - missing media track
		NotReadableError - user permissions given but hardware/OS error
		OverconstrainedError - constraint video settings preventing
		TypeError - audio: false, video: false
		*********************************/
	};
	
	checkOldBrowsers = () => {
		if (navigator.mediaDevices === undefined) {
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
			navigator.mediaDevices.enumerateDevices()
			.then(devices => {
				devices.forEach(device => { /* console.log(device.kind.toUpperCase(), device.label);*/ });
			}).catch(error => { console.log(error.name, error.message);});
		}
	}
	
	visualize = (stream) => {
		
		if (!this.audioCtx) {
			this.audioCtx = new AudioContext();
		}
		let canvas = this.visualizerCanvas.current;
		let canvasCtx = canvas.getContext('2d');
		
		const source = this.audioCtx.createMediaStreamSource(stream);
		const analyser = this.audioCtx.createAnalyser();
		analyser.fftSize = 2048;
		const bufferLength = analyser.frequencyBinCount;
		const dataArray = new Uint8Array(bufferLength);
	
		source.connect(analyser); //analyser.connect(this.audioCtx.destination);
	
		draw();
		function draw() {
			const WIDTH = canvas.width
			const HEIGHT = canvas.height;
	
			requestAnimationFrame(draw);
	
			analyser.getByteTimeDomainData(dataArray);
	
			canvasCtx.fillStyle = 'rgb(0, 0, 0)';
			canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);
	
			canvasCtx.lineWidth = 2;
			canvasCtx.strokeStyle = 'rgb(0, 255, 0)';
	
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
		
		let parentX = this.parentContainer.current;
		let vizCanvas = this.visualizerCanvas.current
		console.log(parentX.offsetWidth, vizCanvas.offsetWidth);
		
		
		window.onresize = function() {
			console.log('resize');
			
			vizCanvas.width = parentX.offsetWidth;
		}
		window.onresize();
		
	}

	render() {
		
		this.initializeMediaRecorder();
		
		return (
			<div className="media-recorder" ref={this.parentContainer}>
				<h1>React MediaRecorder</h1>
				
				<p>Welcome to the Media Recorder&trade;, where all of your wildest media recording dreams will come true.</p>
		
				<p><button id="btnStart">START RECORDING</button><br/>
				<button id="btnStop">STOP RECORDING</button></p>
				
				<div className="visualizer-container">
					<canvas ref={this.visualizerCanvas} className="visualizer" height="60px"></canvas>
				</div>
				
				<div className="video-feed-container">
					<video id="cameraFeed" className="input" muted></video>
					<video id="cameraOutput" className="output" controls></video>
				</div>
				
			</div>
		);
	}
}

ReactDOM.render(
	<HTMLMediaRecorder />,
	document.getElementById('root')
);