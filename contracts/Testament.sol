// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Address.sol";

contract Testament {
    using Address for address payable;

    address private _owner;
    address private _doctor;
    bool private _isDead;
    mapping(address => uint256) private _beneficiaries;

    event DoctorChanged(address indexed newDoctor);
    event Bequeathed(address indexed benefactor, uint256 amount);
    event Withdrew(address indexed benefactor, uint256 amount);
    event Died(address indexed doctor, address indexed owner);
    event Removed(address indexed benefactor, uint256 amount);

    constructor(address owner_, address doctor_) {
        require(owner_ != doctor_, "Testament: Owner cannot be his own doctor");
        _owner = owner_;
        _doctor = doctor_;
    }

    modifier onlyOwner() {
        require(msg.sender == _owner, "Testament: Your are not the owner of this contract");
        _;
    }

    modifier onlyAlive() {
        require(!_isDead, "Testament: Sorry you are dead, probably");
        _;
    }

    modifier onlyDoctor() {
        require(msg.sender == _doctor, "Testament: you are not the doctor of this contract");
        _;
    }

    function quoteShare() public {
        require(_isDead, "Testament: the owner is still alive, be patient");
        require(_beneficiaries[msg.sender] > 0, "Testament: Sorry there is nothing for you");
        uint256 amount = _beneficiaries[msg.sender];
        _beneficiaries[msg.sender] = 0;
        payable(msg.sender).sendValue(amount);
        emit Withdrew(msg.sender, amount);
    }

    function setDoctor(address newDoctor) public onlyOwner onlyAlive {
        require(msg.sender != newDoctor, "Testament: You cannot be your own doctor");
        _doctor = newDoctor;
        emit DoctorChanged(newDoctor);
    }

    function passAway() public onlyDoctor {
        require(!_isDead, "Testament: The owner is already dead");
        _isDead = true;
        emit Died(msg.sender, _owner);
    }

    function remove(address account) public onlyOwner onlyAlive {
        uint256 amount = _beneficiaries[account];
        _beneficiaries[account] = 0;
        payable(_owner).sendValue(amount);
        emit Removed(account, amount);
    }

    function bequeath(address account) public payable onlyOwner onlyAlive {
        require(account != address(0), "Testament: transfer to the zero address");
        _beneficiaries[account] += msg.value;
        emit Bequeathed(account, msg.value);
    }

    function alive() public view returns (bool) {
        return !_isDead;
    }

    function total() public view returns (uint256) {
        return address(this).balance;
    }

    function owner() public view returns (address) {
        return _owner;
    }

    function doctor() public view returns (address) {
        return _doctor;
    }

    function benefactorOf(address account) public view returns (uint256) {
        return _beneficiaries[account];
    }
}
