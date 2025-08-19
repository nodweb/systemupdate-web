import { Link } from "react-router-dom";

export default function Devices() {
  return (
    <div>
      <h1>Devices</h1>
      <ul>
        <li>
          <Link to="/devices/1">Example Device #1</Link>
        </li>
      </ul>
    </div>
  );
}
