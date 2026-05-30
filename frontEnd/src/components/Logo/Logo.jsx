import "./Logo.css";
import rnaLogo from "../../assets/rna-logo.png";

function Logo({ title, tagline }) {
    return (
        <div className="logo-container">

            <img
                src={rnaLogo}
                alt="RNA Logo"
                className="logo-image"
            />

            <h1 className="logo-title">
                {title}
            </h1>

            <p className="logo-tagline">
                {tagline}
            </p>

        </div>
    );
}

export default Logo;