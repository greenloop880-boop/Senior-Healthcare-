import React from 'react';
import { CloseIcon, StarIcon } from './Icons';
import { useAppContext } from '../context/AppContext';

const QUIZ_QUESTIONS = {
  lung: [
    {
      question: "Do you experience breathlessness or heavy breathing during short walks or climbing stairs?",
      options: ["Yes, frequently", "Sometimes / mild effort", "No, never"]
    },
    {
      question: "Are you exposed to active/passive smoking, traffic dust, or cooking smoke daily?",
      options: ["Yes, high exposure", "Moderate exposure", "No exposure"]
    },
    {
      question: "Do you have a persistent cough, morning phlegm, or wheezing sounds?",
      options: ["Yes, daily occurrence", "Occasional dry cough", "No, clear breathing"]
    }
  ],
  gut: [
    {
      question: "How often do you experience constipation, bloating, or irregular bowel movements?",
      options: ["Almost daily", "Few times a week", "Rarely / normal digestion"]
    },
    {
      question: "Do you feel heavy, bloated, or experience acidic reflux after eating simple meals?",
      options: ["Yes, very often", "Occasionally with heavy food", "No, digest food easily"]
    },
    {
      question: "What is your typical daily water intake?",
      options: ["Less than 1 Litre", "Around 1 to 2 Litres", "More than 2 Litres"]
    }
  ],
  joint: [
    {
      question: "Do you experience joint stiffness (especially knees or back) upon waking up in the morning?",
      options: ["Severe stiffness / takes time to move", "Mild stiffness that clears up in minutes", "No stiffness at all"]
    },
    {
      question: "Does knee pain or swelling restrict your regular walking or climbing stairs?",
      options: ["Significantly limits movement", "Occasional mild discomfort", "No, I walk comfortably"]
    },
    {
      question: "Have you had a balance slip, near-fall, or felt unsafe walking on wet bathroom floors?",
      options: ["Yes, faced balance loss", "Feel unsteady sometimes", "No, my balance is very stable"]
    }
  ]
};

export default function Modals() {
  const {
    activeQuizId, setActiveQuizId,
    activeVideoId, setActiveVideoId,
    activeReviewDetail, setActiveReviewDetail,
    helpFormOpen, setHelpFormOpen,
    helpFormData, setHelpFormData,
    currentQuizStep, setCurrentQuizStep,
    quizAnswers, setQuizAnswers,
    showQuizResults, setShowQuizResults,
    allProductsList, navigateTo, addToCart, showToast, submitCallbackRequest
  } = useAppContext();

  // Removed getProductForReview since allProductsList is no longer globally exported and it was hardcoded dummy logic

  const handleQuizAnswer = (optionIdx) => {
    const nextAnswers = { ...quizAnswers, [currentQuizStep]: optionIdx };
    setQuizAnswers(nextAnswers);

    if (currentQuizStep < QUIZ_QUESTIONS[activeQuizId].length - 1) {
      setCurrentQuizStep((prev) => prev + 1);
    } else {
      setShowQuizResults(true);
    }
  };

  const getQuizResultsDetails = () => {
    const scores = Object.values(quizAnswers);
    const totalQuestions = QUIZ_QUESTIONS[activeQuizId].length;
    const riskSum = scores.reduce((sum, val) => sum + val, 0);
    const maxPossible = totalQuestions * 2;
    const scorePercentage = Math.round((riskSum / maxPossible) * 100);

    let status = "";
    let advice = "";
    let recommendedCategory = "";

    if (activeQuizId === "lung") {
      if (scorePercentage < 40) {
        status = "Attention Needed: Respiratory Sensitivity";
        advice = "Your assessment suggests breathing discomfort or exposure markers. We recommend regular clean air monitoring and consulting an expert for deep breathing support.";
        recommendedCategory = "Nebulizers & Breathing Care";
      } else if (scorePercentage < 80) {
        status = "Moderate Respiratory Wellness";
        advice = "You have stable breathing but could benefit from protecting your air quality indoors, especially during seasonal smog changes.";
        recommendedCategory = "Nebulizers & Breathing Care";
      } else {
        status = "Excellent Lung Capacity";
        advice = "Your lungs show high adaptability. Keep up active breathing exercises and outdoor morning walks!";
        recommendedCategory = "BP Monitors & Other Devices";
      }
    } else if (activeQuizId === "gut") {
      if (scorePercentage < 40) {
        status = "Irregular Gut Flora & Digestion";
        advice = "High frequency of bloating or irregularity detected. Prioritize higher hydration, natural prebiotic foods, and mild, senior-friendly herbal digestives.";
        recommendedCategory = "Gut Balance";
      } else if (scorePercentage < 80) {
        status = "Mild Digestive Fluctuation";
        advice = "Your stomach is relatively healthy but reacts occasionally to foods. Incorporate dietary fiber and drink warm water after meals.";
        recommendedCategory = "Consti Calm";
      } else {
        status = "Highly Balanced Gut Microbiome";
        advice = "Fantastic digestive efficiency! Continue maintaining your current hydration levels and wholesome diet.";
        recommendedCategory = "Gut Balance";
      }
    } else if (activeQuizId === "joint") {
      if (scorePercentage < 40) {
        status = "High Joint Strain & Fall Susceptibility";
        advice = "Your knees or back experience regular strain which might impact balance. We highly recommend knee stabilizers to offload strain and bathroom grab bars for safety.";
        recommendedCategory = "Knee Support";
      } else if (scorePercentage < 80) {
        status = "Mild Joint Stiffness";
        advice = "Some joint friction observed. Consider ankle support wraps and regular, low-impact movements to keep the synovial fluid circulating.";
        recommendedCategory = "Ankle & Wrist Support";
      } else {
        status = "Optimal Joint Flexibility";
        advice = "Excellent joint stability and balance. Maintain light stretches and stay active!";
        recommendedCategory = "Walking Sticks";
      }
    }

    return { status, advice, scorePercentage, recommendedCategory };
  };

  const handleHelpSubmit = (e) => {
    e.preventDefault();
    if (!helpFormData.name || !helpFormData.phone) return;
    submitCallbackRequest(helpFormData);
    setHelpFormOpen(false);
    setHelpFormData({ name: '', phone: '', timeSlot: '' });
  };

  return (
    <>
      {activeQuizId && (
        <div className="modal-overlay" onClick={() => setActiveQuizId(null)}>
          <div className="quiz-modal" onClick={(e) => e.stopPropagation()}>
            <button className="quiz-close-btn" onClick={() => setActiveQuizId(null)} aria-label="Close Quiz">
              <CloseIcon />
            </button>

            {!showQuizResults ? (
              <>
                <div className="quiz-header">
                  <span className="quiz-steps-tracker">Question {currentQuizStep + 1} of {QUIZ_QUESTIONS[activeQuizId].length}</span>
                  <h3 className="quiz-title">{activeQuizId.charAt(0).toUpperCase() + activeQuizId.slice(1)} Health Check</h3>
                </div>
                <div className="quiz-question-container">
                  <div className="quiz-question">{QUIZ_QUESTIONS[activeQuizId][currentQuizStep].question}</div>
                  <div className="quiz-options-list">
                    {QUIZ_QUESTIONS[activeQuizId][currentQuizStep].options.map((option, idx) => (
                      <button
                        key={idx}
                        className={`quiz-option-btn ${quizAnswers[currentQuizStep] === idx ? 'selected' : ''}`}
                        onClick={() => handleQuizAnswer(idx)}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="quiz-footer">
                  <button
                    className="btn-secondary-sm"
                    disabled={currentQuizStep === 0}
                    onClick={() => setCurrentQuizStep((prev) => prev - 1)}
                  >
                    BACK
                  </button>
                  <span style={{ color: 'var(--text-gray)', fontSize: '13px', display: 'flex', alignItems: 'center' }}>Keep moving</span>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '10px 0' }} className="animate-fade">
                <span className="quiz-steps-tracker">Assessment Complete</span>
                <h3 className="quiz-title" style={{ marginBottom: '20px' }}>Your Health Profile</h3>

                <div style={{
                  width: '120px',
                  height: '120px',
                  borderRadius: '50%',
                  border: '8px solid var(--primary-red)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 20px auto'
                }}>
                  <span style={{ fontSize: '24px', fontWeight: '900', color: 'var(--primary-red)' }}>
                    {getQuizResultsDetails().scorePercentage}%
                  </span>
                </div>

                <div className="quiz-result-status">{getQuizResultsDetails().status}</div>
                <p className="quiz-result-advice">{getQuizResultsDetails().advice}</p>

                <div style={{
                  backgroundColor: 'var(--bg-beige)',
                  padding: '20px',
                  borderRadius: '8px',
                  marginBottom: '24px',
                  border: '1px solid var(--bg-light-beige)'
                }}>
                  <h4 style={{ color: 'var(--text-dark)', fontSize: '14px', marginBottom: '8px', fontWeight: '700' }}>
                    RECOMMENDED CATEGORY:
                  </h4>
                  <div style={{ fontWeight: '800', color: 'var(--primary-red)', fontSize: '18px' }}>
                    {getQuizResultsDetails().recommendedCategory}
                  </div>
                </div>

                <button
                  className="btn-primary-sm"
                  style={{ width: '100%', padding: '12px', fontSize: '14px' }}
                  onClick={() => {
                    const rec = getQuizResultsDetails().recommendedCategory;
                    setActiveQuizId(null);
                    navigateTo('collection', { activeCategory: rec });
                  }}
                >
                  VIEW RECOMMENDATIONS
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {helpFormOpen && (
        <div className="modal-overlay" onClick={() => setHelpFormOpen(false)}>
          <div className="quiz-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '480px' }}>
            <button className="quiz-close-btn" onClick={() => setHelpFormOpen(false)} aria-label="Close Help">
              <CloseIcon />
            </button>
            <div className="quiz-header">
              <h3 className="quiz-title">Request a Callback</h3>
            </div>
            <form onSubmit={handleHelpSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '700', marginBottom: '6px', display: 'block', color: 'var(--text-dark)' }}>
                  Senior or Caregiver's Name
                </label>
                <input
                  type="text"
                  className="newsletter-input"
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', color: 'var(--text-dark)' }}
                  placeholder="Enter name"
                  value={helpFormData.name}
                  onChange={(e) => setHelpFormData({ ...helpFormData, name: e.target.value })}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '700', marginBottom: '6px', display: 'block', color: 'var(--text-dark)' }}>
                  Phone Number
                </label>
                <input
                  type="tel"
                  className="newsletter-input"
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', color: 'var(--text-dark)' }}
                  placeholder="Enter 10-digit number"
                  pattern="[0-9]{10}"
                  value={helpFormData.phone}
                  onChange={(e) => setHelpFormData({ ...helpFormData, phone: e.target.value })}
                  required
                />
              </div>
              <div>
                <label style={{ fontSize: '13px', fontWeight: '700', marginBottom: '6px', display: 'block', color: 'var(--text-dark)' }}>
                  Preferred Consultation Slot
                </label>
                <select
                  className="newsletter-input"
                  style={{ backgroundColor: '#FFFFFF', border: '1px solid var(--border-color)', color: 'var(--text-dark)' }}
                  value={helpFormData.timeSlot}
                  onChange={(e) => setHelpFormData({ ...helpFormData, timeSlot: e.target.value })}
                >
                  <option value="">Select a convenient time</option>
                  <option value="morning">Morning (10:00 AM - 1:00 PM)</option>
                  <option value="afternoon">Afternoon (1:00 PM - 5:00 PM)</option>
                  <option value="evening">Evening (5:00 PM - 8:00 PM)</option>
                </select>
              </div>
              <button
                type="submit"
                className="btn-primary-sm"
                style={{ width: '100%', padding: '14px', fontSize: '14px', marginTop: '8px' }}
              >
                SCHEDULE CALL
              </button>
            </form>
          </div>
        </div>
      )}

      {activeVideoId && (
        <div className="modal-overlay" onClick={() => setActiveVideoId(null)}>
          <div className="quiz-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', padding: '0', backgroundColor: '#000000', borderRadius: '12px', overflow: 'hidden' }}>
            <button
              className="quickview-close-btn"
              onClick={() => setActiveVideoId(null)}
              style={{ top: '10px', right: '10px', background: '#FFFFFF', color: '#000000' }}
            >
              <CloseIcon />
            </button>
            <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden' }}>
              <iframe
                src={`https://www.youtube.com/embed/${activeVideoId}?autoplay=1`}
                title="YouTube video player"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
              ></iframe>
            </div>
          </div>
        </div>
      )}

      {activeReviewDetail && (
        <div className="modal-overlay" onClick={() => setActiveReviewDetail(null)}>
          <div className="testimonial-modal" onClick={(e) => e.stopPropagation()}>
            <button className="quickview-close-btn" onClick={() => setActiveReviewDetail(null)} aria-label="Close Testimonial">
              <CloseIcon />
            </button>
            <div className="testimonial-modal-left">
              <img src={activeReviewDetail.bg_image_url || activeReviewDetail.bgImage} alt={activeReviewDetail.author} />
            </div>
            <div className="testimonial-modal-right">
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                  <div className="testimonial-modal-stars">
                    {[...Array(5)].map((_, i) => (
                      <StarIcon key={i} filled={i < activeReviewDetail.stars} />
                    ))}
                  </div>
                  <span className="testimonial-modal-verified">
                    ✓ Verified Buyer
                  </span>
                </div>
                <h2 className="testimonial-modal-title">{activeReviewDetail.title}</h2>
                <div className="testimonial-modal-text">
                  "{activeReviewDetail.review_text || activeReviewDetail.text}"
                </div>
                <div className="testimonial-modal-author" style={{ marginTop: '16px' }}>
                  - {activeReviewDetail.author}
                </div>
              </div>

              {activeReviewDetail.product_icon_url && (
                <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#f8fafc', borderRadius: '8px' }}>
                  <img src={activeReviewDetail.product_icon_url} alt="Product Icon" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
                  <span style={{ fontSize: '14px', fontWeight: '500', color: '#334155' }}>Reviewed Product</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
