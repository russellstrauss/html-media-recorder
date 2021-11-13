import React from 'react';
import ReactDOM from 'react-dom';
import './index.css';

class HTMLMediaRecorder extends React.Component {
	
	constructor(props) {
		super(props);
		this.mediaRecorder = null;
	  }
	
	initializeMediaRecorder = () => {
		
		
		let constraintObj = { 
			audio: true,
			video: true
		};
		
		this.checkOldBrowsers();
		
		navigator.mediaDevices.getUserMedia(constraintObj).then((mediaStreamObj) => {
			//connect the media stream to the first video element
			let video = document.querySelector('video');
			if ("srcObject" in video) {
				video.srcObject = mediaStreamObj;
			} else {
				//old version
				video.src = window.URL.createObjectURL(mediaStreamObj);
			}
			
			video.onloadedmetadata = (event) => {
				video.play(); 	//show in the video element what is being captured by the webcam
			};
			
			console.log(1)
			
			//add listeners for saving video/audio
			let start = document.getElementById('btnStart');
			let stop = document.getElementById('btnStop');
			let vidSave = document.getElementById('cameraOutput');
			this.mediaRecorder = new MediaRecorder(mediaStreamObj);
			
			console.log('media', this.mediaRecorder);
			let chunks = [];
			
			start.addEventListener('click', (event) => {
				console.log('start', this.mediaRecorder);
				this.mediaRecorder.start();
				console.log(this.mediaRecorder.state);
			})
			stop.addEventListener('click', (event) => {
				this.mediaRecorder.stop();
				console.log(this.mediaRecorder.state);
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
			navigator.mediaDevices.getUserMedia = function(constraintObj) {
				let getUserMedia = navigator.webkitGetUserMedia || navigator.mozGetUserMedia;
				if (!getUserMedia) {
					return Promise.reject(new Error('getUserMedia is not implemented in this browser'));
				}
				return new Promise(function(resolve, reject) {
					getUserMedia.call(navigator, constraintObj, resolve, reject);
				});
			}
		}
		else{
			navigator.mediaDevices.enumerateDevices()
			.then(devices => {
				devices.forEach(device=>{
					// console.log(device.kind.toUpperCase(), device.label);
				})
			})
			.catch(err=>{
				console.log(err.name, err.message);
			})
		}
	}

	render() {
		
		this.initializeMediaRecorder();

		return (
			<div className="mediaRecorder">
				<h1>React MediaRecorder</h1>
				
				<p>Welcome to the Media Recorder&trade;, where all of your wildest media recording dreams will come true.</p>
		
				<p><button id="btnStart">START RECORDING</button><br/>
				<button id="btnStop">STOP RECORDING</button></p>
				
				<video id="cameraFeed" muted></video>
				<video id="cameraOutput" controls></video>
			</div>
		);
	}
}

ReactDOM.render(
	<HTMLMediaRecorder />,
	document.getElementById('root')
);